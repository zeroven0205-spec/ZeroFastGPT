import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import { APP_ENTRY_REQUEST_HEADER } from '@fastgpt/global/openapi/core/appEntry/auth';
import { AppErrEnum } from '@fastgpt/global/common/error/code/app';

const mocks = vi.hoisted(() => ({
  appEnv: {
    APP_ENTRY_ENABLED: true,
    APP_ENTRY_APP_KEY: 'customer-service',
    APP_ENTRY_APP_ID: '507f1f77bcf86cd799439011',
    APP_ENTRY_BRAND_NAME: '',
    APP_ENTRY_BRAND_DESCRIPTION: '',
    APP_ENTRY_BRAND_LOGO: '',
    APP_ENTRY_BRAND_FAVICON: '',
    APP_ENTRY_PRIMARY_COLOR: '#3370FF',
    APP_ENTRY_SUPPORT_URL: undefined,
    APP_ENTRY_PRIVACY_URL: undefined,
    APP_ENTRY_TERMS_URL: undefined
  },
  findOne: vi.fn(),
  authApp: vi.fn(),
  logger: { error: vi.fn() }
}));

vi.mock('@/env', () => ({ appEnv: mocks.appEnv }));
vi.mock('@fastgpt/service/core/app/schema', () => ({
  MongoApp: {
    findOne: mocks.findOne
  }
}));
vi.mock('@fastgpt/service/support/permission/app/auth', () => ({
  authApp: mocks.authApp
}));
vi.mock('@fastgpt/service/common/logger', () => ({
  getLogger: () => mocks.logger,
  LogCategories: { MODULE: { APP: ['app'] } }
}));

const { authAppEntry, authAppEntryChatTarget, getAppEntryConfig, toPublicAppEntryConfig } =
  await import('@/service/core/appEntry/config');

const availableApp = {
  _id: '507f1f77bcf86cd799439011',
  name: '客服助手',
  intro: '帮助用户处理常见问题',
  avatar: 'https://example.com/logo.png',
  type: AppTypeEnum.workflow
};

const setAppResult = (app: unknown) => {
  mocks.findOne.mockReturnValue({
    lean: vi.fn().mockResolvedValue(app)
  });
};

describe('AppEntry server configuration', () => {
  beforeEach(() => {
    mocks.appEnv.APP_ENTRY_ENABLED = true;
    mocks.appEnv.APP_ENTRY_APP_KEY = 'customer-service';
    mocks.appEnv.APP_ENTRY_APP_ID = '507f1f77bcf86cd799439011';
    mocks.appEnv.APP_ENTRY_BRAND_NAME = '';
    mocks.appEnv.APP_ENTRY_BRAND_DESCRIPTION = '';
    mocks.appEnv.APP_ENTRY_BRAND_LOGO = '';
    mocks.appEnv.APP_ENTRY_BRAND_FAVICON = '';
    mocks.appEnv.APP_ENTRY_PRIMARY_COLOR = '#3370FF';
    mocks.appEnv.APP_ENTRY_SUPPORT_URL = undefined;
    mocks.appEnv.APP_ENTRY_PRIVACY_URL = undefined;
    mocks.appEnv.APP_ENTRY_TERMS_URL = undefined;
    mocks.findOne.mockReset();
    mocks.authApp.mockReset();
  });

  it('does not query Mongo when AppEntry is disabled or appKey does not match', async () => {
    mocks.appEnv.APP_ENTRY_ENABLED = false;
    await expect(getAppEntryConfig({ appKey: 'customer-service' })).resolves.toBeNull();

    mocks.appEnv.APP_ENTRY_ENABLED = true;
    await expect(getAppEntryConfig({ appKey: 'other-app' })).resolves.toBeNull();
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('rejects invalid configured App IDs before querying Mongo', async () => {
    mocks.appEnv.APP_ENTRY_APP_ID = 'not-an-object-id';
    await expect(getAppEntryConfig({ appKey: 'customer-service' })).resolves.toBeNull();
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ['missing app', null],
    ['deleted app', null],
    ['non-chat app', { ...availableApp, type: AppTypeEnum.folder }]
  ])('returns no config for %s', async (_case, app) => {
    setAppResult(app);
    await expect(getAppEntryConfig({ appKey: 'customer-service' })).resolves.toBeNull();
  });

  it('builds a minimal config and removes appId from public config', async () => {
    setAppResult(availableApp);
    const config = await getAppEntryConfig({ appKey: ' customer-service ' });

    expect(config).toMatchObject({
      appKey: 'customer-service',
      appId: '507f1f77bcf86cd799439011',
      enabled: true,
      brand: {
        name: '客服助手',
        description: '帮助用户处理常见问题',
        logo: 'https://example.com/logo.png',
        favicon: 'https://example.com/logo.png',
        primaryColor: '#3370FF'
      },
      features: {
        showHistory: true,
        allowFileUpload: false,
        allowVoiceInput: true,
        showCitation: true,
        showFeedback: false,
        allowRegister: false
      }
    });

    const publicConfig = toPublicAppEntryConfig({ config: config! });
    expect(publicConfig).not.toHaveProperty('appId');
    expect(publicConfig).toMatchObject({ appKey: 'customer-service' });
  });

  it('uses explicit brand environment values when provided', async () => {
    setAppResult(availableApp);
    mocks.appEnv.APP_ENTRY_BRAND_NAME = '业务助手';
    mocks.appEnv.APP_ENTRY_BRAND_DESCRIPTION = '业务专属服务';
    mocks.appEnv.APP_ENTRY_BRAND_LOGO = '/brand/logo.svg';
    mocks.appEnv.APP_ENTRY_BRAND_FAVICON = '/brand/favicon.ico';
    mocks.appEnv.APP_ENTRY_SUPPORT_URL = 'https://example.com/support';

    await expect(getAppEntryConfig({ appKey: 'customer-service' })).resolves.toMatchObject({
      brand: {
        name: '业务助手',
        description: '业务专属服务',
        logo: '/brand/logo.svg',
        favicon: '/brand/favicon.ico',
        supportUrl: 'https://example.com/support'
      }
    });
  });

  it('sanitizes platform defaults from the public AppEntry brand', () => {
    const publicConfig = toPublicAppEntryConfig({
      config: {
        appKey: 'customer-service',
        appId: '507f1f77bcf86cd799439011',
        enabled: true,
        brand: {
          name: 'FastGPT',
          description: 'AI Platform assistant',
          logo: '/favicon.ico',
          favicon: 'https://fastgpt.example/favicon.ico',
          primaryColor: '#123456',
          supportUrl: 'https://fastgpt.example/support'
        },
        features: {
          showHistory: true,
          allowFileUpload: false,
          allowVoiceInput: true,
          showCitation: true,
          showFeedback: false,
          allowRegister: false
        }
      }
    });

    expect(publicConfig.brand.name).toBe('应用');
    expect(publicConfig.brand.logo).toMatch(/^data:image\/svg\+xml,/);
    expect(publicConfig.brand.favicon).toBe(publicConfig.brand.logo);
    expect(publicConfig.brand.supportUrl).toBeUndefined();
    expect(JSON.stringify(publicConfig.brand)).not.toMatch(/fastgpt|ai platform/i);
  });

  it('authenticates the configured app through the existing permission service', async () => {
    setAppResult(availableApp);
    mocks.authApp.mockResolvedValue({ permission: { hasReadPer: true }, app: availableApp });

    const req = {} as never;
    const result = await authAppEntry({ req, appKey: 'customer-service' });

    expect(mocks.authApp).toHaveBeenCalledWith({
      req,
      authToken: true,
      appId: '507f1f77bcf86cd799439011',
      per: expect.any(Number)
    });
    expect(result.config.appId).toBe('507f1f77bcf86cd799439011');
  });

  it('rejects invalid AppEntry before attempting user authentication', async () => {
    await expect(authAppEntry({ req: {} as never, appKey: 'invalid' })).rejects.toBe(
      AppErrEnum.unExist
    );
    expect(mocks.authApp).not.toHaveBeenCalled();
  });

  it('propagates existing permission errors from the shared auth service', async () => {
    setAppResult(availableApp);
    mocks.authApp.mockRejectedValue(AppErrEnum.unAuthApp);

    await expect(authAppEntry({ req: {} as never, appKey: 'customer-service' })).rejects.toBe(
      AppErrEnum.unAuthApp
    );
  });

  it('keeps ordinary Chat requests unchanged when no AppEntry scope is present', async () => {
    await expect(
      authAppEntryChatTarget({
        req: { headers: {} } as never,
        sourceType: ChatSourceTypeEnum.app,
        sourceId: 'another-app'
      })
    ).resolves.toBeUndefined();
    expect(mocks.authApp).not.toHaveBeenCalled();
  });

  it('re-authenticates scoped Chat requests and binds them to the configured App', async () => {
    setAppResult(availableApp);
    mocks.authApp.mockResolvedValue({ permission: { hasReadPer: true }, app: availableApp });
    const req = {
      headers: { [APP_ENTRY_REQUEST_HEADER]: 'customer-service' }
    } as never;

    await expect(
      authAppEntryChatTarget({
        req,
        sourceType: ChatSourceTypeEnum.app,
        sourceId: '507f1f77bcf86cd799439011'
      })
    ).resolves.toMatchObject({ config: { appKey: 'customer-service' } });
    expect(mocks.authApp).toHaveBeenCalledWith(
      expect.objectContaining({ req, appId: '507f1f77bcf86cd799439011' })
    );
  });

  it('rejects a scoped Chat request targeting another App or source type', async () => {
    setAppResult(availableApp);
    mocks.authApp.mockResolvedValue({ permission: { hasReadPer: true }, app: availableApp });
    const req = {
      headers: { [APP_ENTRY_REQUEST_HEADER]: 'customer-service' }
    } as never;

    await expect(
      authAppEntryChatTarget({
        req,
        sourceType: ChatSourceTypeEnum.app,
        sourceId: '507f1f77bcf86cd799439099'
      })
    ).rejects.toThrow(AppErrEnum.unAuthApp);
    await expect(
      authAppEntryChatTarget({
        req,
        sourceType: ChatSourceTypeEnum.skillEdit,
        sourceId: '507f1f77bcf86cd799439011'
      })
    ).rejects.toThrow(AppErrEnum.unAuthApp);
  });
});
