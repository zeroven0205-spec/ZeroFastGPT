const GPTGO_GITHUB_URL = 'https://github.com/zeroven0205-spec/';
const DEFAULT_FASTGPT_HOME_ORIGIN = GPTGO_GITHUB_URL;

export const DOCS_UTM_CAMPAIGNS = {
  gettingStarted: 'docs_getting_started',
  cloudIntro: 'docs_cloud_intro',
  cloudFaq: 'docs_cloud_faq',
  selfHostDev: 'docs_self_host_dev'
} as const;

export type DocsUtmCampaign = (typeof DOCS_UTM_CAMPAIGNS)[keyof typeof DOCS_UTM_CAMPAIGNS];
export type FastGPTSite = 'configured' | 'cn' | 'io';

const normalizeOrigin = (value?: string): string => {
  try {
    const url = new URL(value || DEFAULT_FASTGPT_HOME_ORIGIN);
    url.search = '';
    url.hash = '';
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}/`;
  } catch {
    return DEFAULT_FASTGPT_HOME_ORIGIN;
  }
};

export const getFastGPTHomeOrigin = (): string => {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_FASTGPT_HOME_DOMAIN || process.env.FASTGPT_HOME_DOMAIN;
  return configuredOrigin && !/fastgpt/i.test(configuredOrigin)
    ? normalizeOrigin(configuredOrigin)
    : DEFAULT_FASTGPT_HOME_ORIGIN;
};

export const getFastGPTDocsOrigin = (): string => {
  const configuredOrigin = process.env.NEXT_PUBLIC_DOCS_ORIGIN;
  const docsOrigin =
    configuredOrigin && !/fastgpt/i.test(configuredOrigin)
      ? normalizeOrigin(configuredOrigin)
      : GPTGO_GITHUB_URL;
  return docsOrigin.replace(/\/$/, '');
};

export const buildFastGPTHomeUrl = ({
  campaign,
  content,
  site = 'configured'
}: {
  campaign: DocsUtmCampaign;
  content: string;
  site?: FastGPTSite;
}): string => {
  const origin = site === 'configured' ? getFastGPTHomeOrigin() : GPTGO_GITHUB_URL;
  const url = new URL(origin);

  url.searchParams.set('utm_source', 'docs');
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', content);

  return url.toString();
};
