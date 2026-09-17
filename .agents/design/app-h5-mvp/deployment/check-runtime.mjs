#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';

const MODES = new Set(['baseline', 'release-config', 'runtime']);
const REQUIRED_RUNTIME_KEYS = [
  'APP_ENTRY_ENABLED',
  'APP_ENTRY_APP_KEY',
  'APP_ENTRY_APP_ID',
  'APP_ENTRY_AUTH_CODE_SECRET',
  'APP_ENTRY_AUTH_CODE_TTL_SECONDS',
  'FE_DOMAIN',
  'AUTH_COOKIE_SECURE'
];
const DEFAULT_DNS_TARGETS = [
  'fastgpt-mongo:27017',
  'fastgpt-redis:6379',
  'fastgpt-minio:9000',
  'fastgpt-plugin:3000',
  'fastgpt-code-sandbox:3000',
  'fastgpt-aiproxy:3000',
  'fastgpt-opensandbox-server:8090',
  'fastgpt-volume-manager:3000'
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    mode: 'baseline',
    compose: 'docker-compose.yml',
    env: '',
    container: 'fastgpt-app',
    url: '',
    dns: DEFAULT_DNS_TARGETS
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (!arg.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument: ${arg}`);
    }

    switch (arg) {
      case '--mode':
        result.mode = value;
        break;
      case '--compose':
        result.compose = value;
        break;
      case '--env':
        result.env = value;
        break;
      case '--container':
        result.container = value;
        break;
      case '--url':
        result.url = value;
        break;
      case '--dns':
        result.dns = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
    index += 1;
  }

  if (!MODES.has(result.mode)) {
    throw new Error(`Unsupported mode: ${result.mode}`);
  }
  return result;
};

const run = (command, args, { allowFailure = false, input } = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(result.stderr.trim() || `${command} exited with ${result.status}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
};

const findComposeCommand = () => {
  const standalone = run('sh', ['-c', 'command -v docker-compose'], { allowFailure: true });
  if (standalone.status === 0 && standalone.stdout) {
    return { command: standalone.stdout, prefix: [] };
  }

  const plugin = run('docker', ['compose', 'version'], { allowFailure: true });
  if (plugin.status === 0) {
    return { command: 'docker', prefix: ['compose'] };
  }
  throw new Error('Docker Compose is not available');
};

const runCompose = (composeCommand, composeFile, args) =>
  run(composeCommand.command, [...composeCommand.prefix, '-f', composeFile, ...args]);

const parseEnvFile = (path) => {
  const values = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
    values[key] = value;
  }
  return values;
};

const validateReleaseEnv = (values) => {
  const failures = [];
  const required = [
    ...REQUIRED_RUNTIME_KEYS,
    'APP_ENTRY_BRAND_NAME',
    'APP_ENTRY_BRAND_LOGO',
    'APP_ENTRY_BRAND_FAVICON',
    'APP_ENTRY_PRIMARY_COLOR',
    'APP_ENTRY_PRIVACY_URL',
    'APP_ENTRY_TERMS_URL'
  ];

  for (const key of required) {
    if (!values[key]) failures.push(`${key} is required`);
  }
  if (values.APP_ENTRY_ENABLED !== 'true') {
    failures.push('APP_ENTRY_ENABLED must be true');
  }
  if (values.APP_ENTRY_APP_KEY && !/^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(values.APP_ENTRY_APP_KEY)) {
    failures.push('APP_ENTRY_APP_KEY format is invalid');
  }
  if (values.APP_ENTRY_APP_ID && !/^[0-9a-fA-F]{24}$/.test(values.APP_ENTRY_APP_ID)) {
    failures.push('APP_ENTRY_APP_ID must be a 24 character ObjectId');
  }
  if ((values.APP_ENTRY_AUTH_CODE_SECRET?.length ?? 0) < 32) {
    failures.push('APP_ENTRY_AUTH_CODE_SECRET must contain at least 32 characters');
  }

  const ttl = Number(values.APP_ENTRY_AUTH_CODE_TTL_SECONDS);
  if (!Number.isSafeInteger(ttl) || ttl < 30 || ttl > 120) {
    failures.push('APP_ENTRY_AUTH_CODE_TTL_SECONDS must be an integer between 30 and 120');
  }
  if (values.APP_ENTRY_PRIMARY_COLOR && !/^#[0-9a-fA-F]{6}$/.test(values.APP_ENTRY_PRIMARY_COLOR)) {
    failures.push('APP_ENTRY_PRIMARY_COLOR must be a 6 digit hex color');
  }
  if (values.AUTH_COOKIE_SECURE !== 'true') {
    failures.push('AUTH_COOKIE_SECURE must be true for the production WebView');
  }

  for (const key of [
    'FE_DOMAIN',
    'APP_ENTRY_BRAND_LOGO',
    'APP_ENTRY_BRAND_FAVICON',
    'APP_ENTRY_SUPPORT_URL',
    'APP_ENTRY_PRIVACY_URL',
    'APP_ENTRY_TERMS_URL'
  ]) {
    if (!values[key]) continue;
    try {
      const parsed = new URL(values[key]);
      if (parsed.protocol !== 'https:') failures.push(`${key} must use HTTPS`);
    } catch {
      failures.push(`${key} must be an absolute URL`);
    }
  }

  if (values.NEXT_PUBLIC_BASE_URL && !/^\/[A-Za-z0-9/_-]*$/.test(values.NEXT_PUBLIC_BASE_URL)) {
    failures.push('NEXT_PUBLIC_BASE_URL must be empty or an absolute path');
  }

  return failures;
};

const inspectContainer = (container) => {
  const inspected = run('docker', ['inspect', container, '--format', '{{json .}}'], {
    allowFailure: true
  });
  if (inspected.status !== 0 || !inspected.stdout) return null;

  const data = JSON.parse(inspected.stdout);
  const envValues = Object.fromEntries(
    (data.Config?.Env ?? []).map((item) => {
      const separator = item.indexOf('=');
      return separator < 0 ? [item, ''] : [item.slice(0, separator), item.slice(separator + 1)];
    })
  );
  const envKeys = Object.keys(envValues).sort();
  return {
    image: data.Config?.Image ?? '',
    imageId: data.Image ?? '',
    status: data.State?.Status ?? 'unknown',
    health: data.State?.Health?.Status ?? 'not-configured',
    restartPolicy: data.HostConfig?.RestartPolicy?.Name ?? '',
    networks: Object.keys(data.NetworkSettings?.Networks ?? {}).sort(),
    mounts: (data.Mounts ?? []).map((mount) => ({
      type: mount.Type,
      name: mount.Name || '(bind)',
      destination: mount.Destination
    })),
    envKeys,
    envValues,
    labelKeys: Object.keys(data.Config?.Labels ?? {}).sort()
  };
};

const checkDnsTargets = (container, targets) => {
  if (!targets.length) return [];
  const script = `
const net = require('net');
const targets = JSON.parse(process.argv[1]);
Promise.all(targets.map(({host, port}) => new Promise((resolve) => {
  const socket = net.connect({ host, port });
  const timer = setTimeout(() => { socket.destroy(); resolve({host, port, ok:false}); }, 3000);
  socket.on('connect', () => { clearTimeout(timer); socket.end(); resolve({host, port, ok:true}); });
  socket.on('error', () => { clearTimeout(timer); resolve({host, port, ok:false}); });
}))).then((result) => process.stdout.write(JSON.stringify(result)));
`;
  const parsedTargets = targets.map((target) => {
    const separator = target.lastIndexOf(':');
    return { host: target.slice(0, separator), port: Number(target.slice(separator + 1)) };
  });
  const result = run(
    'docker',
    ['exec', container, 'node', '-e', script, JSON.stringify(parsedTargets)],
    {
      allowFailure: true
    }
  );
  return result.status === 0 && result.stdout ? JSON.parse(result.stdout) : [];
};

const checkUrl = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    return { url, status: response.status, ok: response.status >= 200 && response.status < 400 };
  } catch {
    return { url, status: 0, ok: false };
  }
};

const main = async () => {
  const args = parseArgs();
  const compose = findComposeCommand();
  const failures = [];

  runCompose(compose, args.compose, ['config', '--quiet']);
  const services = runCompose(compose, args.compose, ['config', '--services'])
    .stdout.split(/\r?\n/)
    .filter(Boolean);
  const networks = runCompose(compose, args.compose, ['config', '--networks'])
    .stdout.split(/\r?\n/)
    .filter(Boolean);
  const volumes = runCompose(compose, args.compose, ['config', '--volumes'])
    .stdout.split(/\r?\n/)
    .filter(Boolean);

  let envValidation = null;
  if (args.mode === 'release-config') {
    if (!args.env) throw new Error('--env is required in release-config mode');
    const envValues = parseEnvFile(args.env);
    const envFailures = validateReleaseEnv(envValues);
    failures.push(...envFailures);
    envValidation = {
      file: args.env,
      checkedKeys: Object.keys(envValues)
        .filter((key) => key.startsWith('APP_ENTRY_'))
        .sort(),
      valid: envFailures.length === 0
    };
  }

  const container = args.mode === 'release-config' ? null : inspectContainer(args.container);
  if (args.mode !== 'release-config' && !container) {
    failures.push(`container ${args.container} is not running or cannot be inspected`);
  }
  if (args.mode === 'runtime' && container) {
    if (container.status !== 'running') failures.push(`${args.container} is not running`);
    if (container.health !== 'healthy') failures.push(`${args.container} health is not healthy`);
    const missingKeys = REQUIRED_RUNTIME_KEYS.filter((key) => !container.envKeys.includes(key));
    if (missingKeys.length) {
      failures.push(`runtime is missing AppEntry env keys: ${missingKeys.join(', ')}`);
    }
    if (missingKeys.length === 0) {
      const runtimeEnvFailures = validateReleaseEnv(container.envValues);
      failures.push(...runtimeEnvFailures.map((failure) => `runtime config: ${failure}`));
    }
  }

  const dns = container ? checkDnsTargets(args.container, args.dns) : [];
  const failedDns = dns.filter((item) => !item.ok);
  if (failedDns.length) {
    failures.push(
      `dependency connectivity failed: ${failedDns.map((item) => `${item.host}:${item.port}`).join(', ')}`
    );
  }
  const urlCheck = await checkUrl(args.url);
  if (urlCheck && !urlCheck.ok) failures.push(`URL probe failed: ${args.url}`);

  const report = {
    mode: args.mode,
    compose: {
      file: args.compose,
      valid: true,
      services,
      networks,
      volumes
    },
    envValidation,
    container: container
      ? {
          image: container.image,
          imageId: container.imageId,
          status: container.status,
          health: container.health,
          restartPolicy: container.restartPolicy,
          networks: container.networks,
          mounts: container.mounts,
          appEntryEnvKeys: container.envKeys.filter((key) => key.startsWith('APP_ENTRY_')),
          labelKeys: container.labelKeys
        }
      : null,
    dependencyConnectivity: dns,
    urlCheck,
    failures
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
};

main().catch((error) => {
  process.stderr.write(`deployment preflight failed: ${error.message}\n`);
  process.exitCode = 1;
});
