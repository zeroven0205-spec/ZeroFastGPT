import { createHash, timingSafeEqual } from 'node:crypto';
import z from 'zod';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';
import { AppErrEnum } from '@fastgpt/global/common/error/code/app';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import { asRedisLogicalKey, redisCacheAdapter } from '@fastgpt/dal/redis/adapter';
import { authAppByTmbId } from '@fastgpt/service/support/permission/app/auth';
import { getTmbInfoByTmbId } from '@fastgpt/service/support/user/team/controller';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { assertUserCanLogin } from '@fastgpt/service/support/user/account/cancellation/guard';
import { createUserSession } from '@fastgpt/service/support/user/session';
import { appEnv } from '@/env';
import { getAppEntryConfig } from './config';

const APP_ENTRY_AUTH_CODE_NAMESPACE = 'cache:app_entry:auth_code';
const MAX_AUTH_CODE_CREATE_ATTEMPTS = 3;

const AppEntryAuthCodePayloadSchema = z
  .object({
    version: z.literal(1),
    appKey: z.string(),
    userId: z.string(),
    teamId: z.string(),
    tmbId: z.string(),
    issuedAt: z.number().int().nonnegative()
  })
  .strict();
type AppEntryAuthCodePayload = z.infer<typeof AppEntryAuthCodePayloadSchema>;

const CONSUME_AUTH_CODE_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if not value then
  return nil
end
redis.call("DEL", KEYS[1])
return value
`;

const getAuthCodeKey = (code: string) =>
  asRedisLogicalKey(
    `${APP_ENTRY_AUTH_CODE_NAMESPACE}:${createHash('sha256').update(code).digest('hex')}`
  );

/**
 * 校验 APP 后端签发登录码时使用的 Bearer 凭证。
 * 使用常量时间比较，且在未配置专用密钥时默认关闭签发能力。
 */
export const assertAppEntryAuthCodeIssuer = ({ authorization }: { authorization?: string }) => {
  const configuredSecret = appEnv.APP_ENTRY_AUTH_CODE_SECRET.trim();
  const providedSecret = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!configuredSecret || !providedSecret) {
    throw new Error(ERROR_ENUM.unAuthorization);
  }

  const configuredBuffer = Buffer.from(configuredSecret);
  const providedBuffer = Buffer.from(providedSecret);
  if (
    configuredBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(configuredBuffer, providedBuffer)
  ) {
    throw new Error(ERROR_ENUM.unAuthorization);
  }
};

/**
 * 为已由业务 APP 服务端确认身份的成员签发短时一次性 authCode。
 * 接口只接受 tmbId，用户和团队信息均从服务端成员记录派生，并在签发前校验 App 读取权限。
 */
export const issueAppEntryAuthCode = async ({
  appKey,
  tmbId
}: {
  appKey: string;
  tmbId: string;
}) => {
  const config = await getAppEntryConfig({ appKey });
  if (!config) {
    throw new Error(AppErrEnum.unExist);
  }

  const member = await getTmbInfoByTmbId({ tmbId });
  const user = await MongoUser.findById(member.userId, 'status').lean();
  if (!user || user.status === UserStatusEnum.forbidden) {
    throw new Error(ERROR_ENUM.unAuthorization);
  }

  await assertUserCanLogin(member.userId);
  await authAppByTmbId({
    tmbId: member.tmbId,
    appId: config.appId,
    per: ReadPermissionVal
  });

  const payload: AppEntryAuthCodePayload = {
    version: 1,
    appKey: config.appKey,
    userId: member.userId,
    teamId: member.teamId,
    tmbId: member.tmbId,
    issuedAt: Date.now()
  };

  for (let attempt = 0; attempt < MAX_AUTH_CODE_CREATE_ATTEMPTS; attempt += 1) {
    const code = getNanoid(48);
    const created = await redisCacheAdapter.setIfAbsent({
      key: getAuthCodeKey(code),
      value: JSON.stringify(payload),
      ttlSeconds: appEnv.APP_ENTRY_AUTH_CODE_TTL_SECONDS
    });

    if (created) {
      return {
        code,
        expiresIn: appEnv.APP_ENTRY_AUTH_CODE_TTL_SECONDS
      };
    }
  }

  throw new Error('Failed to create AppEntry auth code');
};

/**
 * 原子消费 authCode 并创建现有用户 Session。
 * Redis 脚本先读取后删除，确保并发回调中只有一次能够成功；消费后再次校验成员、用户和 App 权限。
 */
export const exchangeAppEntryAuthCode = async ({
  appKey,
  code,
  ip
}: {
  appKey: string;
  code: string;
  ip?: string | null;
}) => {
  const rawPayload = await redisCacheAdapter.evalScript({
    script: CONSUME_AUTH_CODE_SCRIPT,
    keys: [getAuthCodeKey(code)]
  });
  if (typeof rawPayload !== 'string') {
    throw new Error(ERROR_ENUM.unAuthorization);
  }

  const parsedPayload = (() => {
    try {
      return AppEntryAuthCodePayloadSchema.safeParse(JSON.parse(rawPayload));
    } catch {
      return { success: false } as const;
    }
  })();
  if (!parsedPayload.success || parsedPayload.data.appKey !== appKey) {
    throw new Error(ERROR_ENUM.unAuthorization);
  }

  const config = await getAppEntryConfig({ appKey });
  if (!config) {
    throw new Error(AppErrEnum.unExist);
  }

  const payload = parsedPayload.data;
  const member = await getTmbInfoByTmbId({ tmbId: payload.tmbId });
  if (member.userId !== payload.userId || member.teamId !== payload.teamId) {
    throw new Error(ERROR_ENUM.unAuthorization);
  }

  const user = await MongoUser.findById(payload.userId, 'status').lean();
  if (!user || user.status === UserStatusEnum.forbidden) {
    throw new Error(ERROR_ENUM.unAuthorization);
  }

  await assertUserCanLogin(payload.userId);
  await authAppByTmbId({
    tmbId: payload.tmbId,
    appId: config.appId,
    per: ReadPermissionVal
  });

  return createUserSession({
    userId: payload.userId,
    teamId: payload.teamId,
    tmbId: payload.tmbId,
    ip
  });
};
