import type { GetServerSideProps, NextPage } from 'next';
import { setCookie } from '@fastgpt/service/support/permission/auth/common';
import { getClientIpFromRequest } from '@fastgpt/service/common/security/clientIp';
import { exchangeAppEntryAuthCode } from '@/service/core/appEntry/auth';
import { getAppEntryConfig } from '@/service/core/appEntry/config';
import {
  getAppEntryLoginPath,
  getAppEntryPath,
  getSafeAppEntryReturnPath
} from '@/web/core/appEntry/route';

const AppEntryAuthCallbackPage: NextPage = () => null;

/**
 * APP WebView authCode 回调。
 * 服务端原子消费一次性 code、写入现有 HttpOnly Cookie 后立即 302，避免长期凭证出现在 URL 或前端状态中。
 */
export const getServerSideProps: GetServerSideProps = async ({ params, query, req, res }) => {
  const appKey = typeof params?.appKey === 'string' ? params.appKey.trim() : '';
  if (!appKey) return { notFound: true };

  const config = await getAppEntryConfig({ appKey });
  if (!config) {
    return {
      redirect: { destination: getAppEntryPath(appKey, 'unavailable'), permanent: false }
    };
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');

  const returnTo = getSafeAppEntryReturnPath({
    appKey,
    returnTo: typeof query.returnTo === 'string' ? query.returnTo : undefined
  });
  const code = typeof query.code === 'string' && query.code.length <= 128 ? query.code : '';

  try {
    if (!code) throw new Error('Invalid auth code');

    const sessionId = await exchangeAppEntryAuthCode({
      appKey,
      code,
      ip: getClientIpFromRequest(req)
    });
    setCookie(res, sessionId);

    return {
      redirect: {
        destination: returnTo,
        permanent: false
      }
    };
  } catch {
    const loginPath = getAppEntryLoginPath({ appKey, returnTo });
    return {
      redirect: {
        destination: `${loginPath}&authError=auth_code`,
        permanent: false
      }
    };
  }
};

export default AppEntryAuthCallbackPage;
