import type { AppEntryBrandConfig } from './type';

const DEFAULT_APP_ENTRY_BRAND_NAME = '应用';
const DEFAULT_APP_ENTRY_PRIMARY_COLOR = '#3370FF';
const PLATFORM_BRAND_PATTERN = /\b(?:fast\s*gpt|ai\s*platform)\b/gi;
const PLATFORM_ASSET_PATTERN = /(?:fast\s*gpt|ai[-_\s]*platform|\/favicon\.ico(?:[?#]|$))/i;
const HEX_COLOR_PATTERN = /^#([\da-f]{6})$/i;

const replacePlatformBrand = (text: string, replacement: string) =>
  text
    .replace(PLATFORM_BRAND_PATTERN, replacement)
    .replace(/\s{2,}/g, ' ')
    .trim();

const normalizeBrandColor = (color: string) =>
  HEX_COLOR_PATTERN.test(color.trim())
    ? color.trim().toUpperCase()
    : DEFAULT_APP_ENTRY_PRIMARY_COLOR;

const mixHexColor = (color: string, target: '#FFFFFF' | '#000000', weight: number) => {
  const normalizedColor = normalizeBrandColor(color);
  const sourceValue = Number.parseInt(normalizedColor.slice(1), 16);
  const targetValue = Number.parseInt(target.slice(1), 16);
  const channel = (shift: number) => {
    const sourceChannel = (sourceValue >> shift) & 0xff;
    const targetChannel = (targetValue >> shift) & 0xff;
    return Math.round(sourceChannel + (targetChannel - sourceChannel) * weight)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${channel(16)}${channel(8)}${channel(0)}`.toUpperCase();
};

const escapeXmlText = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const getSafeBusinessAsset = (asset?: string) => {
  const normalizedAsset = asset?.trim() ?? '';
  return normalizedAsset && !PLATFORM_ASSET_PATTERN.test(normalizedAsset) ? normalizedAsset : '';
};

const getSafeBusinessUrl = (url?: string) => {
  const normalizedUrl = url?.trim();
  return normalizedUrl && !PLATFORM_ASSET_PATTERN.test(normalizedUrl) ? normalizedUrl : undefined;
};

/** 将 AppEntry 业务名称用于纯文本展示，移除平台产品名并提供中性兜底。 */
export const getAppEntryBrandName = (name: string) =>
  replacePlatformBrand(name, DEFAULT_APP_ENTRY_BRAND_NAME) || DEFAULT_APP_ENTRY_BRAND_NAME;

/**
 * 生成不依赖平台静态资源的业务图标。
 * 当部署方未提供 Logo/Favicon 时，使用业务名称首字符和业务主色生成 SVG data URL。
 */
export const getAppEntryGeneratedBrandIcon = ({
  name,
  primaryColor
}: Pick<AppEntryBrandConfig, 'name' | 'primaryColor'>) => {
  const displayName = getAppEntryBrandName(name);
  const initial = Array.from(displayName)[0] ?? '应';
  const color = normalizeBrandColor(primaryColor);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="34" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeXmlText(initial)}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * 收敛 AppEntry 最终可见品牌配置。
 * 平台名称、平台默认图标和平台链接不会进入 DOM；缺失资源使用业务名称和主色生成。
 */
export const getAppEntryDisplayBrand = (brand: AppEntryBrandConfig): AppEntryBrandConfig => {
  const name = getAppEntryBrandName(brand.name);
  const primaryColor = normalizeBrandColor(brand.primaryColor);
  const generatedIcon = getAppEntryGeneratedBrandIcon({ name, primaryColor });
  const logo = getSafeBusinessAsset(brand.logo) || generatedIcon;
  const favicon = getSafeBusinessAsset(brand.favicon) || logo;

  return {
    ...brand,
    name,
    description: replacePlatformBrand(brand.description, name),
    logo,
    favicon,
    primaryColor,
    supportUrl: getSafeBusinessUrl(brand.supportUrl),
    privacyUrl: getSafeBusinessUrl(brand.privacyUrl),
    termsUrl: getSafeBusinessUrl(brand.termsUrl)
  };
};

/** 生成 AppEntry 根节点使用的 Chakra 主色变量，避免共享 Chat 控件回落到平台默认蓝色。 */
export const getAppEntryThemeCssVariables = (primaryColor: string): Record<string, string> => {
  const color = normalizeBrandColor(primaryColor);

  return {
    '--chakra-colors-primary-50': mixHexColor(color, '#FFFFFF', 0.94),
    '--chakra-colors-primary-100': mixHexColor(color, '#FFFFFF', 0.86),
    '--chakra-colors-primary-200': mixHexColor(color, '#FFFFFF', 0.72),
    '--chakra-colors-primary-300': mixHexColor(color, '#FFFFFF', 0.52),
    '--chakra-colors-primary-400': mixHexColor(color, '#FFFFFF', 0.28),
    '--chakra-colors-primary-500': color,
    '--chakra-colors-primary-600': mixHexColor(color, '#000000', 0.14),
    '--chakra-colors-primary-700': mixHexColor(color, '#000000', 0.28),
    '--chakra-colors-primary-800': mixHexColor(color, '#000000', 0.42),
    '--chakra-colors-primary-900': mixHexColor(color, '#000000', 0.56)
  };
};
