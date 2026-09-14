import React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import NextHead from '@/components/common/NextHead';
import AppEntryLayout from '@/pageComponents/appEntry/AppEntryLayout';
import { AppEntryChat } from '@/pageComponents/appEntry/AppEntryChat';
import type { AppEntryPublicConfig } from '@/web/core/appEntry/type';
import {
  authAppEntry,
  getAppEntryConfig,
  toPublicAppEntryConfig
} from '@/service/core/appEntry/config';
import { getAppEntryLoginPath, getAppEntryPath } from '@/web/core/appEntry/route';
import { serviceSideProps } from '@/web/common/i18n/utils';

type Props = {
  appKey: string;
  appId: string;
  config: AppEntryPublicConfig;
};

const AppEntryChatPage: NextPage<Props> = ({ appKey, appId, config }) => (
  <>
    <NextHead
      appEntry
      title={config.brand.name}
      desc={config.brand.description}
      icon={config.brand.favicon}
    />
    <AppEntryLayout
      brand={config.brand}
      showHeader={false}
      contentOverflow="hidden"
      contentPaddingBottom={0}
    >
      <AppEntryChat appKey={appKey} appId={appId} config={config} />
    </AppEntryLayout>
  </>
);

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { params, req, resolvedUrl } = context;
  const appKey = typeof params?.appKey === 'string' ? params.appKey.trim() : '';
  if (!appKey) return { notFound: true };

  const config = await getAppEntryConfig({ appKey });
  if (!config) {
    return {
      redirect: { destination: getAppEntryPath(appKey, 'unavailable'), permanent: false }
    };
  }

  try {
    const auth = await authAppEntry({ req, appKey });
    return {
      props: {
        appKey,
        appId: auth.config.appId,
        config: toPublicAppEntryConfig({ config }),
        ...(await serviceSideProps(context, ['file', 'app', 'chat', 'workflow', 'user']))
      }
    };
  } catch {
    return {
      redirect: {
        destination: getAppEntryLoginPath({ appKey, returnTo: resolvedUrl }),
        permanent: false
      }
    };
  }
};

export default AppEntryChatPage;
