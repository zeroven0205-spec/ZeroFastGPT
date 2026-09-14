import { Types } from 'mongoose';
import { AppTypeList } from '@fastgpt/global/core/app/constants';
import { ObjectIdSchema } from '@fastgpt/global/common/type/mongo';
import { AppErrEnum } from '@fastgpt/global/common/error/code/app';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import type { PermissionValueType } from '@fastgpt/global/support/permission/type';
import type { AppEntryConfig, AppEntryPublicConfig } from '@/web/core/appEntry/type';
import { getAppEntryDisplayBrand } from '@/web/core/appEntry/brand';
import { appEnv } from '@/env';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { authApp } from '@fastgpt/service/support/permission/app/auth';
import type { NodeHttpRequest } from '@fastgpt/service/types/http';
import { getLogger, LogCategories } from '@fastgpt/service/common/logger';
import { APP_ENTRY_REQUEST_HEADER } from '@fastgpt/global/openapi/core/appEntry/auth';
import { AppEntryAppKeySchema } from '@fastgpt/global/openapi/core/appEntry/api';
import { ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';

const DEFAULT_APP_ENTRY_BRAND_NAME = '应用';
const DEFAULT_APP_ENTRY_DESCRIPTION = '智能应用';
const DEFAULT_APP_ENTRY_PRIMARY_COLOR = '#3370FF';
const logger = getLogger(LogCategories.MODULE.APP);

/**
 * 服务端解析单部署单业务方的 AppEntry 配置。
 *
 * appKey 只参与配置匹配，内部 App ID 永远从服务端环境变量读取，避免由 URL
 * 直接拼接任意 App ID。解析失败统一返回 null，调用方可映射为 notFound 或业务错误。
 */
export const getAppEntryConfig = async ({
  appKey
}: {
  appKey: string;
}): Promise<AppEntryConfig | null> => {
  const normalizedAppKey = appKey.trim();
  const configuredAppKey = appEnv.APP_ENTRY_APP_KEY.trim();
  const configuredAppId = appEnv.APP_ENTRY_APP_ID.trim();

  if (
    !appEnv.APP_ENTRY_ENABLED ||
    !normalizedAppKey ||
    !configuredAppKey ||
    normalizedAppKey !== configuredAppKey ||
    !ObjectIdSchema.safeParse(configuredAppId).success
  ) {
    return null;
  }

  let app;
  try {
    app = await MongoApp.findOne(
      {
        _id: new Types.ObjectId(configuredAppId),
        deleteTime: null
      },
      'name intro avatar type'
    ).lean();
  } catch (error) {
    logger.error('AppEntry app lookup failed', { error });
    return null;
  }

  if (!app || !AppTypeList.includes(app.type)) {
    return null;
  }

  const brandName = appEnv.APP_ENTRY_BRAND_NAME.trim() || app.name || DEFAULT_APP_ENTRY_BRAND_NAME;
  const brandDescription =
    appEnv.APP_ENTRY_BRAND_DESCRIPTION.trim() || app.intro?.trim() || DEFAULT_APP_ENTRY_DESCRIPTION;
  const logo = appEnv.APP_ENTRY_BRAND_LOGO.trim() || app.avatar || '';
  const favicon = appEnv.APP_ENTRY_BRAND_FAVICON.trim() || logo;

  return {
    appKey: normalizedAppKey,
    appId: configuredAppId,
    enabled: true,
    brand: {
      name: brandName,
      description: brandDescription,
      logo,
      favicon,
      primaryColor: appEnv.APP_ENTRY_PRIMARY_COLOR.trim() || DEFAULT_APP_ENTRY_PRIMARY_COLOR,
      supportUrl: appEnv.APP_ENTRY_SUPPORT_URL,
      privacyUrl: appEnv.APP_ENTRY_PRIVACY_URL,
      termsUrl: appEnv.APP_ENTRY_TERMS_URL
    },
    features: {
      showHistory: true,
      allowFileUpload: false,
      allowVoiceInput: true,
      showCitation: true,
      showFeedback: false,
      allowRegister: false
    }
  };
};

/** 删除内部 App ID，供页面或公共配置 API 返回。 */
export const toPublicAppEntryConfig = ({
  config
}: {
  config: AppEntryConfig;
}): AppEntryPublicConfig => {
  const { appId: _appId, ...publicConfig } = config;
  return {
    ...publicConfig,
    brand: getAppEntryDisplayBrand(publicConfig.brand)
  };
};

/**
 * AppEntry 数据 API 的统一访问守卫。
 *
 * 调用方必须传入 URL 中的 appKey，守卫先完成单部署映射，再复用现有 authApp
 * 校验当前用户/团队对目标 App 的读取权限，避免只在前端隐藏 App ID 或数据。
 */
export const authAppEntry = async ({
  req,
  appKey,
  per = ReadPermissionVal
}: {
  req: NodeHttpRequest;
  appKey: string;
  per?: PermissionValueType;
}) => {
  const config = await getAppEntryConfig({ appKey });
  if (!config) {
    return Promise.reject(AppErrEnum.unExist);
  }

  const auth = await authApp({
    req,
    authToken: true,
    appId: config.appId,
    per
  });

  return {
    ...auth,
    config
  };
};

/** 读取共享 Chat API 请求携带的 AppEntry 作用域；普通平台请求未携带时保持原行为。 */
export const getAppEntryRequestKey = ({ req }: { req: NodeHttpRequest }) => {
  const headerValue = req.headers?.[APP_ENTRY_REQUEST_HEADER];
  const rawAppKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!rawAppKey) return;

  const parsed = AppEntryAppKeySchema.safeParse(rawAppKey);
  if (!parsed.success) {
    throw new Error(AppErrEnum.unAuthApp);
  }
  return parsed.data;
};

/**
 * 当共享 Chat API 来自 AppEntry 页面时，强制重新执行 authAppEntry 并校验目标 App。
 * 普通 `/chat`、API Key 和分享链接未携带作用域 Header，继续沿用原鉴权行为。
 */
export const authAppEntryChatTarget = async ({
  req,
  sourceType,
  sourceId,
  per = ReadPermissionVal
}: {
  req: NodeHttpRequest;
  sourceType: ChatSourceTypeEnum;
  sourceId?: string;
  per?: PermissionValueType;
}) => {
  const appKey = getAppEntryRequestKey({ req });
  if (!appKey) return;
  if (sourceType !== ChatSourceTypeEnum.app || !sourceId) {
    throw new Error(AppErrEnum.unAuthApp);
  }

  const auth = await authAppEntry({ req, appKey, per });
  if (auth.config.appId !== sourceId) {
    throw new Error(AppErrEnum.unAuthApp);
  }
  return auth;
};
