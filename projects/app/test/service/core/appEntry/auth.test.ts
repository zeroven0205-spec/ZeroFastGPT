import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';

const mocks = vi.hoisted(() => ({
  appEnv: {
    APP_ENTRY_AUTH_CODE_SECRET: 'issuer-secret',
    APP_ENTRY_AUTH_CODE_TTL_SECONDS: 60
  },
  setIfAbsent: vi.fn(),
  evalScript: vi.fn(),
  getAppEntryConfig: vi.fn(),
  getTmbInfoByTmbId: vi.fn(),
  userLean: vi.fn(),
  authAppByTmbId: vi.fn(),
  assertUserCanLogin: vi.fn(),
  createUserSession: vi.fn()
}));

vi.mock('@/env', () => ({ appEnv: mocks.appEnv }));
vi.mock('@fastgpt/dal/redis/adapter', () => ({
  asRedisLogicalKey: (key: string) => key,
  redisCacheAdapter: {
    setIfAbsent: mocks.setIfAbsent,
    evalScript: mocks.evalScript
  }
}));
vi.mock('@/service/core/appEntry/config', () => ({
  getAppEntryConfig: mocks.getAppEntryConfig
}));
vi.mock('@fastgpt/service/support/user/team/controller', () => ({
  getTmbInfoByTmbId: mocks.getTmbInfoByTmbId
}));
vi.mock('@fastgpt/service/support/user/schema', () => ({
  MongoUser: {
    findById: vi.fn(() => ({ lean: mocks.userLean }))
  }
}));
vi.mock('@fastgpt/service/support/permission/app/auth', () => ({
  authAppByTmbId: mocks.authAppByTmbId
}));
vi.mock('@fastgpt/service/support/user/account/cancellation/guard', () => ({
  assertUserCanLogin: mocks.assertUserCanLogin
}));
vi.mock('@fastgpt/service/support/user/session', () => ({
  createUserSession: mocks.createUserSession
}));

import {
  assertAppEntryAuthCodeIssuer,
  exchangeAppEntryAuthCode,
  issueAppEntryAuthCode
} from '@/service/core/appEntry/auth';

const config = {
  appKey: 'customer-service',
  appId: '507f1f77bcf86cd799439011'
};
const member = {
  userId: '507f1f77bcf86cd799439012',
  teamId: '507f1f77bcf86cd799439013',
  tmbId: '507f1f77bcf86cd799439014'
};

const createPayload = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    appKey: config.appKey,
    ...member,
    issuedAt: Date.now(),
    ...overrides
  });

describe('AppEntry authCode service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appEnv.APP_ENTRY_AUTH_CODE_SECRET = 'issuer-secret';
    mocks.appEnv.APP_ENTRY_AUTH_CODE_TTL_SECONDS = 60;
    mocks.getAppEntryConfig.mockResolvedValue(config);
    mocks.getTmbInfoByTmbId.mockResolvedValue(member);
    mocks.userLean.mockResolvedValue({ status: UserStatusEnum.active });
    mocks.authAppByTmbId.mockResolvedValue({ app: {} });
    mocks.assertUserCanLogin.mockResolvedValue(undefined);
    mocks.createUserSession.mockResolvedValue('session-id');
    mocks.setIfAbsent.mockResolvedValue(true);
  });

  it('accepts only the configured Bearer issuer secret', () => {
    expect(() =>
      assertAppEntryAuthCodeIssuer({ authorization: 'Bearer issuer-secret' })
    ).not.toThrow();
    expect(() => assertAppEntryAuthCodeIssuer({ authorization: 'Bearer wrong-secret' })).toThrow(
      ERROR_ENUM.unAuthorization
    );
    expect(() => assertAppEntryAuthCodeIssuer({})).toThrow(ERROR_ENUM.unAuthorization);
  });

  it('issues a short-lived code bound to the resolved member and appKey', async () => {
    const result = await issueAppEntryAuthCode({
      appKey: config.appKey,
      tmbId: member.tmbId
    });

    expect(result.code).toHaveLength(48);
    expect(result.expiresIn).toBe(60);
    expect(mocks.authAppByTmbId).toHaveBeenCalledWith({
      tmbId: member.tmbId,
      appId: config.appId,
      per: expect.any(Number)
    });
    expect(mocks.setIfAbsent).toHaveBeenCalledWith({
      key: expect.stringMatching(/^cache:app_entry:auth_code:[a-f0-9]{64}$/),
      value: expect.any(String),
      ttlSeconds: 60
    });

    const storedPayload = JSON.parse(mocks.setIfAbsent.mock.calls[0][0].value);
    expect(storedPayload).toMatchObject({
      version: 1,
      appKey: config.appKey,
      ...member
    });
    expect(storedPayload).not.toHaveProperty('appId');
  });

  it('rejects forbidden users before storing an auth code', async () => {
    mocks.userLean.mockResolvedValue({ status: UserStatusEnum.forbidden });

    await expect(
      issueAppEntryAuthCode({ appKey: config.appKey, tmbId: member.tmbId })
    ).rejects.toThrow(ERROR_ENUM.unAuthorization);
    expect(mocks.setIfAbsent).not.toHaveBeenCalled();
  });

  it('atomically consumes the code and creates an existing user session', async () => {
    mocks.evalScript.mockResolvedValue(createPayload());

    await expect(
      exchangeAppEntryAuthCode({ appKey: config.appKey, code: 'one-time-code', ip: '127.0.0.1' })
    ).resolves.toBe('session-id');

    expect(mocks.evalScript).toHaveBeenCalledWith({
      script: expect.stringContaining('redis.call("DEL", KEYS[1])'),
      keys: [expect.stringMatching(/^cache:app_entry:auth_code:[a-f0-9]{64}$/)]
    });
    expect(mocks.createUserSession).toHaveBeenCalledWith({
      ...member,
      ip: '127.0.0.1'
    });
  });

  it('does not allow a consumed or expired code to create another session', async () => {
    mocks.evalScript.mockResolvedValue(null);

    await expect(
      exchangeAppEntryAuthCode({ appKey: config.appKey, code: 'consumed-code' })
    ).rejects.toThrow(ERROR_ENUM.unAuthorization);
    expect(mocks.createUserSession).not.toHaveBeenCalled();
  });

  it('rejects a code issued for another appKey after consuming it', async () => {
    mocks.evalScript.mockResolvedValue(createPayload({ appKey: 'other-app' }));

    await expect(
      exchangeAppEntryAuthCode({ appKey: config.appKey, code: 'other-app-code' })
    ).rejects.toThrow(ERROR_ENUM.unAuthorization);
    expect(mocks.createUserSession).not.toHaveBeenCalled();
  });
});
