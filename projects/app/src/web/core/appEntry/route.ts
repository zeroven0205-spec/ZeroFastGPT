import { APP_ENTRY_REQUEST_HEADER } from '@fastgpt/global/openapi/core/appEntry/auth';

const APP_ENTRY_ROUTE_PREFIX = '/app/[appKey]';
const APP_ENTRY_PUBLIC_ROUTE_PATTERN = /^\/app\/([^/?#]+)(?:\/|$)/;
const APP_ENTRY_RESERVED_KEYS = new Set(['detail']);

/** 判断 Next.js 当前页面是否属于业务方 AppEntry 动态路由。 */
export const isAppEntryRoute = (pathname: string) =>
  pathname === APP_ENTRY_ROUTE_PREFIX || pathname.startsWith(`${APP_ENTRY_ROUTE_PREFIX}/`);

/** 构造业务方 AppEntry 路由，appKey 只作为外部稳定标识，不暴露内部 App ID。 */
export const getAppEntryPath = (
  appKey: string,
  page?: 'chat' | 'login' | 'auth/callback' | 'unavailable'
) => {
  const encodedAppKey = encodeURIComponent(appKey);
  return page ? `/app/${encodedAppKey}/${page}` : `/app/${encodedAppKey}`;
};

/**
 * 将外部回跳参数约束在当前 AppEntry 路由族内，拒绝协议相对 URL、反斜杠和其他 appKey。
 * 非法值统一回退到当前 AppEntry 首页，避免登录和 authCode 回调形成开放重定向。
 */
export const getSafeAppEntryReturnPath = ({
  appKey,
  returnTo
}: {
  appKey: string;
  returnTo?: string;
}) => {
  const fallbackPath = getAppEntryPath(appKey);
  if (
    !returnTo ||
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    returnTo.includes('\\')
  ) {
    return fallbackPath;
  }

  try {
    const parsed = new URL(returnTo, 'https://app-entry.local');
    const appEntryPath = getAppEntryPath(appKey);
    const isCurrentAppEntry =
      parsed.origin === 'https://app-entry.local' &&
      (parsed.pathname === appEntryPath || parsed.pathname.startsWith(`${appEntryPath}/`));

    return isCurrentAppEntry ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallbackPath;
  } catch {
    return fallbackPath;
  }
};

/** 构造业务方登录页，并只携带经过约束的 AppEntry 回跳地址。 */
export const getAppEntryLoginPath = ({
  appKey,
  returnTo
}: {
  appKey: string;
  returnTo?: string;
}) => {
  const safeReturnTo = getSafeAppEntryReturnPath({ appKey, returnTo });
  const loginPath = getAppEntryPath(appKey, 'login');
  const callbackPath = getAppEntryPath(appKey, 'auth/callback');
  const normalizedReturnTo =
    safeReturnTo === loginPath || safeReturnTo.startsWith(`${callbackPath}?`)
      ? getAppEntryPath(appKey)
      : safeReturnTo;

  return `${loginPath}?returnTo=${encodeURIComponent(normalizedReturnTo)}`;
};

/** 从浏览器实际 AppEntry 地址提取 appKey，供全局鉴权失败拦截器分流到业务登录页。 */
export const getAppEntryKeyFromPublicPath = (path: string) => {
  const pathname = path.split(/[?#]/, 1)[0];
  const matched = pathname.match(APP_ENTRY_PUBLIC_ROUTE_PATTERN);
  if (!matched?.[1]) return null;

  try {
    const appKey = decodeURIComponent(matched[1]);
    return APP_ENTRY_RESERVED_KEYS.has(appKey) ? null : appKey;
  } catch {
    return null;
  }
};

/** 为 AppEntry 发起的共享 API 请求附加稳定作用域，服务端据此重新校验 appKey -> appId。 */
export const getAppEntryRequestHeaders = (pathname: string): Record<string, string> => {
  const appKey = getAppEntryKeyFromPublicPath(pathname);
  return appKey ? { [APP_ENTRY_REQUEST_HEADER]: appKey } : {};
};
