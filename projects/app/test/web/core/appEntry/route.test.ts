import { describe, expect, it } from 'vitest';
import {
  getAppEntryKeyFromPublicPath,
  getAppEntryLoginPath,
  getAppEntryRequestHeaders,
  getAppEntryPath,
  getSafeAppEntryReturnPath,
  isAppEntryRoute
} from '@/web/core/appEntry/route';

describe('AppEntry routes', () => {
  it('recognizes only dynamic AppEntry pages', () => {
    expect(isAppEntryRoute('/app/[appKey]')).toBe(true);
    expect(isAppEntryRoute('/app/[appKey]/chat')).toBe(true);
    expect(isAppEntryRoute('/app/detail')).toBe(false);
    expect(isAppEntryRoute('/chat')).toBe(false);
  });

  it('encodes app keys when building public routes', () => {
    expect(getAppEntryPath('customer service')).toBe('/app/customer%20service');
    expect(getAppEntryPath('customer service', 'chat')).toBe('/app/customer%20service/chat');
    expect(getAppEntryPath('customer service', 'unavailable')).toBe(
      '/app/customer%20service/unavailable'
    );
  });

  it('keeps return paths inside the same AppEntry route family', () => {
    expect(
      getSafeAppEntryReturnPath({
        appKey: 'customer-service',
        returnTo: '/app/customer-service/chat?chatId=1#latest'
      })
    ).toBe('/app/customer-service/chat?chatId=1#latest');

    expect(
      getSafeAppEntryReturnPath({
        appKey: 'customer-service',
        returnTo: '/app/other/chat'
      })
    ).toBe('/app/customer-service');
  });

  it.each([
    'https://evil.example/app/customer-service',
    '//evil.example/app/customer-service',
    '/\\evil.example/app/customer-service',
    '/dashboard/agent'
  ])('rejects unsafe return path %s', (returnTo) => {
    expect(getSafeAppEntryReturnPath({ appKey: 'customer-service', returnTo })).toBe(
      '/app/customer-service'
    );
  });

  it('does not use login or callback pages as post-login return targets', () => {
    expect(
      getAppEntryLoginPath({
        appKey: 'customer-service',
        returnTo: '/app/customer-service/login'
      })
    ).toBe('/app/customer-service/login?returnTo=%2Fapp%2Fcustomer-service');
    expect(
      getAppEntryLoginPath({
        appKey: 'customer-service',
        returnTo: '/app/customer-service/auth/callback?code=secret'
      })
    ).toBe('/app/customer-service/login?returnTo=%2Fapp%2Fcustomer-service');
  });

  it('extracts appKey only from public AppEntry paths', () => {
    expect(getAppEntryKeyFromPublicPath('/app/customer-service/chat?chatId=1')).toBe(
      'customer-service'
    );
    expect(getAppEntryKeyFromPublicPath('/dashboard/agent')).toBeNull();
    expect(getAppEntryKeyFromPublicPath('/app/detail?appId=internal')).toBeNull();
    expect(getAppEntryKeyFromPublicPath('/app/%E0%A4%A/chat')).toBeNull();
  });

  it('adds the AppEntry scope header only for public AppEntry routes', () => {
    expect(getAppEntryRequestHeaders('/app/customer-service/chat')).toEqual({
      'x-app-entry-key': 'customer-service'
    });
    expect(getAppEntryRequestHeaders('/app/detail')).toEqual({});
    expect(getAppEntryRequestHeaders('/chat')).toEqual({});
  });
});
