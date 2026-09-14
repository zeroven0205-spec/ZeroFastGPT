import React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import NextHead from '@/components/common/NextHead';
import AppEntryLayout from '@/pageComponents/appEntry/AppEntryLayout';
import { AppEntryLogin } from '@/pageComponents/appEntry/AppEntryLogin';
import type { AppEntryPublicConfig } from '@/web/core/appEntry/type';
import {
  authAppEntry,
  getAppEntryConfig,
  toPublicAppEntryConfig
} from '@/service/core/appEntry/config';
import { getAppEntryPath, getSafeAppEntryReturnPath } from '@/web/core/appEntry/route';

type Props = {
  appKey: string;
  config: AppEntryPublicConfig;
  returnTo: string;
  authCodeError: boolean;
};

const AppEntryLoginPage: NextPage<Props> = ({ appKey, config, returnTo, authCodeError }) => (
  <>
    <NextHead
      appEntry
      title={`登录 - ${config.brand.name}`}
      desc={config.brand.description}
      icon={config.brand.favicon}
    />
    <AppEntryLayout brand={config.brand}>
      <AppEntryLogin appKey={appKey} returnTo={returnTo} authCodeError={authCodeError} />
    </AppEntryLayout>
  </>
);

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, query, req }) => {
  const appKey = typeof params?.appKey === 'string' ? params.appKey.trim() : '';
  if (!appKey) return { notFound: true };

  const config = await getAppEntryConfig({ appKey });
  if (!config) {
    return {
      redirect: { destination: getAppEntryPath(appKey, 'unavailable'), permanent: false }
    };
  }

  const returnTo = getSafeAppEntryReturnPath({
    appKey,
    returnTo: typeof query.returnTo === 'string' ? query.returnTo : undefined
  });

  try {
    await authAppEntry({ req, appKey });
    return {
      redirect: {
        destination: returnTo,
        permanent: false
      }
    };
  } catch {
    return {
      props: {
        appKey,
        config: toPublicAppEntryConfig({ config }),
        returnTo,
        authCodeError: query.authError === 'auth_code'
      }
    };
  }
};

export default AppEntryLoginPage;
