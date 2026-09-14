import { GET } from '@/web/common/api/request';
import type { AppEntryPublicConfigType } from '@fastgpt/global/openapi/core/appEntry/api';

/** 获取当前业务方 AppEntry 的公共配置，不包含内部 App ID 或权限字段。 */
export const getAppEntryPublicConfig = (appKey: string) =>
  GET<AppEntryPublicConfigType>(`/app/${encodeURIComponent(appKey)}/config`, undefined, {
    deduplicate: true
  });
