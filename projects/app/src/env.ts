import { createEnv } from '@t3-oss/env-core';
import z from 'zod';
import { BoolSchema, IntSchema, UrlSchema } from '@fastgpt/global/common/zod';

export const appEnv = createEnv({
  server: {
    DEFAULT_ROOT_PSW: z.string().default('123456'),
    SSE_MCP_SERVER_PROXY_ENDPOINT: UrlSchema.optional(),

    SYSTEM_NAME: z.string().default('AI'),
    SYSTEM_DESCRIPTION: z.string().default(''),
    SYSTEM_FAVICON: z.string().default(''),

    // AppEntry 单部署单业务方配置；业务方正式资料补齐前允许使用临时品牌配置。
    APP_ENTRY_ENABLED: BoolSchema.default(false),
    APP_ENTRY_APP_KEY: z.string().default(''),
    APP_ENTRY_APP_ID: z.string().default(''),
    APP_ENTRY_BRAND_NAME: z.string().default(''),
    APP_ENTRY_BRAND_DESCRIPTION: z.string().default(''),
    APP_ENTRY_BRAND_LOGO: z.string().default(''),
    APP_ENTRY_BRAND_FAVICON: z.string().default(''),
    APP_ENTRY_PRIMARY_COLOR: z.string().default('#3370FF'),
    APP_ENTRY_SUPPORT_URL: UrlSchema.optional(),
    APP_ENTRY_PRIVACY_URL: UrlSchema.optional(),
    APP_ENTRY_TERMS_URL: UrlSchema.optional(),
    // APP 后端签发一次性登录码使用独立共享密钥；登录码 TTL 强制限制在 30～120 秒。
    APP_ENTRY_AUTH_CODE_SECRET: z
      .string()
      .default('')
      .refine((value) => !value || value.trim().length >= 32, {
        message: 'APP_ENTRY_AUTH_CODE_SECRET must be at least 32 characters when configured'
      }),
    APP_ENTRY_AUTH_CODE_TTL_SECONDS: IntSchema.min(30).max(120).default(60),

    CHINESE_IP_REDIRECT_URL: UrlSchema.default(''),
    PAY_FORM_URL: UrlSchema.default(''),

    SHOW_COUPON: BoolSchema.default(false),
    SHOW_DISCOUNT_COUPON: BoolSchema.default(false),
    HIDE_CHAT_COPYRIGHT_SETTING: BoolSchema.default(false),
    WECOM_LOGIN_AUTO_REDIRECT: BoolSchema.default(false),
    AGENT_SANDBOX_FREE_TIP: BoolSchema.default(false),
    OPENAPI_KEY_MAX_COUNT: IntSchema.min(1).default(100),

    MARKETPLACE_URL: UrlSchema.default('https://v2.marketplace.fastgpt.cn'),
    PASSWORD_EXPIRED_MONTH: IntSchema.optional()
  },
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  onValidationError(issues) {
    const details = issues
      .map((issue) => {
        const path = issue.path?.join('.') || '<root>';
        return `${path}: ${issue.message}`;
      })
      .join('\n');
    throw new Error(`Invalid app environment variables:\n${details}\n`);
  }
});
