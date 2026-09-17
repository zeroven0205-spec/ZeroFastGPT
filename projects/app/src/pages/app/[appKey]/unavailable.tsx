import React from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import NextHead from '@/components/common/NextHead';
import AppEntryLayout from '@/pageComponents/appEntry/AppEntryLayout';
import { AppEntryErrorState } from '@/pageComponents/appEntry/AppEntryErrorState';
import type { AppEntryPublicConfig } from '@/web/core/appEntry/type';
import { getAppEntryPlaceholderConfig } from '@/web/core/appEntry/config';
import { getAppEntryDisplayBrand } from '@/web/core/appEntry/brand';
import { getAppEntryConfig, toPublicAppEntryConfig } from '@/service/core/appEntry/config';

type Props = {
  config: AppEntryPublicConfig;
};

const AppEntryUnavailablePage: NextPage<Props> = ({ config }) => (
  <>
    <NextHead
      appEntry
      title={`服务暂不可用 - ${config.brand.name}`}
      desc={config.brand.description}
      icon={config.brand.favicon}
    />
    <AppEntryLayout brand={config.brand} showHeader={false}>
      <AppEntryErrorState brand={config.brand} onAction={() => window.location.reload()} />
    </AppEntryLayout>
  </>
);

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  res.setHeader('Cache-Control', 'no-store');
  const appKey = typeof params?.appKey === 'string' ? params.appKey.trim() : '';
  const config = appKey ? await getAppEntryConfig({ appKey }) : null;

  if (config) {
    return { props: { config: toPublicAppEntryConfig({ config }) } };
  }

  const { appId: _appId, ...fallbackConfig } = getAppEntryPlaceholderConfig({
    appKey: appKey || 'app'
  });

  return {
    props: {
      config: {
        ...fallbackConfig,
        brand: getAppEntryDisplayBrand(fallbackConfig.brand)
      }
    }
  };
};

export default AppEntryUnavailablePage;
