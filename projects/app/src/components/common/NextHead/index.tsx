import Head from 'next/head';
import React, { useMemo } from 'react';

type Props = {
  title?: string;
  icon?: string;
  desc?: string;
  /** AppEntry 严格使用传入业务图标，并补充移动端桌面图标；不回落到平台 favicon。 */
  appEntry?: boolean;
};

const NextHead = ({ title, icon, desc, appEntry = false }: Props) => {
  const formatIcon = useMemo(() => {
    const isSupportedIcon =
      !!icon &&
      (icon.startsWith('http://') ||
        icon.startsWith('https://') ||
        icon.startsWith('/') ||
        icon.startsWith('data:image/'));

    if (appEntry) return isSupportedIcon && icon !== '/' ? icon : undefined;
    if (!icon || icon === '/') return '/favicon.ico';
    return isSupportedIcon ? icon : '/favicon.ico';
  }, [appEntry, icon]);

  return (
    <Head>
      <title>{title}</title>
      <meta
        name="viewport"
        content="width=device-width,initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0,user-scalable=no, viewport-fit=cover"
      />
      <meta httpEquiv="Content-Security-Policy" content="img-src * data: blob:;" />
      {desc && <meta name="description" content={desc} />}
      {formatIcon && <link rel="icon" href={formatIcon} />}
      {appEntry && formatIcon && <link rel="apple-touch-icon" href={formatIcon} />}
    </Head>
  );
};

export default NextHead;
