import React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import NextHead from '@/components/common/NextHead';
import AppEntryLayout from '@/pageComponents/appEntry/AppEntryLayout';
import { AppEntryHome } from '@/pageComponents/appEntry/AppEntryHome';
import type { AppEntryPublicConfig } from '@/web/core/appEntry/type';
import { getAppEntryConfig, toPublicAppEntryConfig } from '@/service/core/appEntry/config';
import { getAppEntryPath } from '@/web/core/appEntry/route';

type Props = {
  appKey: string;
  config: AppEntryPublicConfig;
};

const AppEntryHomePage: NextPage<Props> = ({ appKey, config }) => (
  <>
    <NextHead
      appEntry
      title={config.brand.name}
      desc={config.brand.description}
      icon={config.brand.favicon}
    />
    <AppEntryLayout brand={config.brand}>
      <AppEntryHome appKey={appKey} />
    </AppEntryLayout>
  </>
);

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const appKey = typeof params?.appKey === 'string' ? params.appKey.trim() : '';
  if (!appKey) return { notFound: true };

  const config = await getAppEntryConfig({ appKey });
  if (!config) {
    return {
      redirect: { destination: getAppEntryPath(appKey, 'unavailable'), permanent: false }
    };
  }

  return { props: { appKey, config: toPublicAppEntryConfig({ config }) } };
};

export default AppEntryHomePage;
