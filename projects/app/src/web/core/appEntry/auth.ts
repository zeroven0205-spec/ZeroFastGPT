import { GET } from '@/web/common/api/request';
import { loginOut } from '@/web/support/user/api';
import type { AppEntryAuthSessionResponseType } from '@fastgpt/global/openapi/core/appEntry/auth';

/** 校验当前 Cookie 对指定 AppEntry 是否仍具备读取权限。 */
export const getAppEntryAuthSession = (appKey: string) =>
  GET<AppEntryAuthSessionResponseType>(
    `/app/${encodeURIComponent(appKey)}/auth/session`,
    undefined,
    { maxQuantity: 1 }
  );

/** 复用现有退出接口，清除 HttpOnly Cookie 并使用户 Session 失效。 */
export const logoutAppEntry = () => loginOut();
