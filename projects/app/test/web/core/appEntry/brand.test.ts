import { describe, expect, it } from 'vitest';
import {
  getAppEntryBrandName,
  getAppEntryDisplayBrand,
  getAppEntryGeneratedBrandIcon,
  getAppEntryThemeCssVariables
} from '@/web/core/appEntry/brand';

describe('AppEntry visible brand', () => {
  it('removes platform product names from visible brand text', () => {
    expect(getAppEntryBrandName('FastGPT 客服')).toBe('应用 客服');
    expect(getAppEntryBrandName('AI Platform')).toBe('应用');
  });

  it('uses generated business assets when platform defaults are provided', () => {
    const brand = getAppEntryDisplayBrand({
      name: 'FastGPT',
      description: 'AI Platform customer service',
      logo: '/favicon.ico',
      favicon: 'https://fastgpt.example/favicon.ico',
      primaryColor: '#123456',
      supportUrl: 'https://fastgpt.example/support'
    });

    expect(brand.name).toBe('应用');
    expect(brand.description).toBe('应用 customer service');
    expect(brand.logo).toMatch(/^data:image\/svg\+xml,/);
    expect(brand.favicon).toBe(brand.logo);
    expect(brand.supportUrl).toBeUndefined();
    expect(JSON.stringify(brand)).not.toMatch(/fastgpt|ai platform/i);
  });

  it('keeps explicit business assets and derives a complete primary palette', () => {
    const icon = getAppEntryGeneratedBrandIcon({ name: '业务助手', primaryColor: '#12ab34' });
    const variables = getAppEntryThemeCssVariables('#12ab34');

    expect(icon).toContain('data:image/svg+xml');
    expect(variables['--chakra-colors-primary-500']).toBe('#12AB34');
    expect(variables['--chakra-colors-primary-50']).not.toBe(
      variables['--chakra-colors-primary-900']
    );
  });
});
