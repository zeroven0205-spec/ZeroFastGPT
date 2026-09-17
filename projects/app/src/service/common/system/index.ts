import fs from 'fs';
import type { FastGPTFeConfigsType } from '@fastgpt/global/common/system/types/index';
import type { FastGPTConfigFileType } from '@fastgpt/global/common/system/types/index';
import { getFastGPTConfigFromDB } from '@fastgpt/service/common/system/config/controller';
import { initFastGPTConfig } from '@fastgpt/service/common/system/tools';
import json5 from 'json5';
import { defaultTemplateTypes } from '@fastgpt/web/core/workflow/constants';
import { MongoPluginToolTag } from '@fastgpt/service/core/plugin/tool/tagSchema';
import { MongoTemplateTypes } from '@fastgpt/service/core/app/templates/templateTypeSchema';
import { POST } from '@fastgpt/service/common/api/plusRequest';
import {
  type DeepRagSearchProps,
  type SearchDatasetDataResponse
} from '@fastgpt/service/core/dataset/search';
import type {
  PushUsageItemsProps,
  ConcatUsageProps,
  CreateUsageProps
} from '@fastgpt/global/support/wallet/usage/api';
import { isProVersion } from '@fastgpt/service/common/system/constants';
import { getLogger, LogCategories } from '@fastgpt/service/common/logger';
import {
  getAgentSandboxArchiveMaxBytes,
  getAgentSandboxMaxFileBytes,
  getAgentSandboxSkillMaxBytes
} from '@fastgpt/service/core/ai/sandbox/interface/config';
import { serviceEnv } from '@fastgpt/service/env';
import { hasAIProxyApiEndpoint } from '@fastgpt/service/thirdProvider/aiproxy/config';
import { appEnv } from '@/env';
import { pluginTagList } from '@fastgpt/global/sdk/fastgpt-plugin';
import { pluginClient } from '@fastgpt/service/thirdProvider/fastgptPlugin';

const logger = getLogger(LogCategories.SYSTEM);
const pluginFeaturesProbeTimeoutMs = 3000;
const GPTGO_GITHUB_URL = 'https://github.com/zeroven0205-spec/';
const defaultOpenSourceLoginGuideDocUrl = GPTGO_GITHUB_URL;

/* Init global variables */
export function initGlobalVariables() {
  function initPlusRequest() {
    global.textCensorHandler = function textCensorHandler({ text }: { text: string }) {
      if (!isProVersion()) return Promise.resolve({ code: 200 });
      return POST<{ code: number; message?: string }>('/common/censor/check', { text });
    };

    global.deepRagHandler = function deepRagHandler(data: DeepRagSearchProps) {
      return POST<SearchDatasetDataResponse>('/core/dataset/deepRag', data);
    };

    global.createUsageHandler = function createUsageHandler(data: CreateUsageProps) {
      if (!isProVersion()) return;
      return POST<string>('/support/wallet/usage/createUsage', data);
    };
    global.concatUsageHandler = function concatUsageHandler(data: ConcatUsageProps) {
      if (!isProVersion()) return;
      return POST('/support/wallet/usage/concatUsage', data);
    };
    global.pushUsageItemsHandler = function pushUsageItemsHandler(data: PushUsageItemsProps) {
      if (!isProVersion()) return;
      return POST('/support/wallet/usage/pushUsageItems', data);
    };
  }

  global.datasetParseQueueLen = global.datasetParseQueueLen ?? 0;
  global.qaQueueLen = global.qaQueueLen ?? 0;
  global.vectorQueueLen = global.vectorQueueLen ?? 0;
  initPlusRequest();
}

/* Init system data(Need to connected db). It only needs to run once */
export async function getInitConfig() {
  const getSystemVersion = async () => {
    if (global.systemVersion) return;
    try {
      if (process.env.NODE_ENV === 'development') {
        global.systemVersion = process.env.npm_package_version || '0.0.0';
      } else {
        const packageJson = json5.parse(await fs.promises.readFile('/app/package.json', 'utf-8'));

        global.systemVersion = packageJson?.version;
      }
      logger.info('System version resolved', { systemVersion: global.systemVersion });
    } catch (error) {
      logger.error('System version resolve failed', { error });

      global.systemVersion = '0.0.0';
    }
  };

  await Promise.all([initSystemConfig(), getSystemVersion()]);
}

const defaultFeConfigs: FastGPTFeConfigsType = {
  show_emptyChat: true,
  show_git: true,
  docUrl: GPTGO_GITHUB_URL,
  openAPIDocUrl: GPTGO_GITHUB_URL,
  enable_team_plugin_upload: false,
  appTemplateCourse:
    'https://fael3z0zfze.feishu.cn/wiki/CX9wwMGyEi5TL6koiLYcg7U0nWb?fromScene=spaceOverview',
  systemTitle: 'gptGO',
  concatMd: `项目开源地址: [gptGO GitHub](${GPTGO_GITHUB_URL})`,
  limit: {
    exportDatasetLimitMinutes: 0,
    websiteSyncLimitMinuted: 0,
    agentSandboxMaxEditDebug: serviceEnv.AGENT_SANDBOX_MAX_EDIT_DEBUG,
    agentSandboxArchiveMaxBytes: getAgentSandboxArchiveMaxBytes(),
    skillSandboxMaxBytes: getAgentSandboxSkillMaxBytes(),
    agentSandboxMaxFileBytes: getAgentSandboxMaxFileBytes(),
    workflowParallelRunMaxConcurrency: serviceEnv.WORKFLOW_PARALLEL_MAX_CONCURRENCY,
    maxFolderDepth: serviceEnv.MAX_FOLDER_DEPTH
  },
  scripts: [],
  favicon: '/favicon.ico',
  chineseRedirectUrl: appEnv.CHINESE_IP_REDIRECT_URL,
  uploadFileMaxSize: serviceEnv.UPLOAD_FILE_MAX_SIZE,
  uploadFileMaxAmount: serviceEnv.UPLOAD_FILE_MAX_AMOUNT
};

async function getPluginRemoteDebugEnabled() {
  try {
    const features = await pluginClient.getPluginServiceFeatures({
      signal: AbortSignal.timeout(pluginFeaturesProbeTimeoutMs)
    });
    return features.remoteDebug === true;
  } catch (error) {
    logger.warn('Plugin service features resolve failed', { error });
    return false;
  }
}

export async function initSystemConfig() {
  /**
   * 清理系统配置中会暴露原产品品牌的公开文案和链接，同时保留内部协议、包名和历史配置键。
   * 自定义配置只有在命中旧品牌时才被替换，避免覆盖部署方自己的标题和业务链接。
   */
  const sanitizePublicBrandConfig = (feConfigs: Partial<FastGPTFeConfigsType>) => {
    const sanitizeText = (value?: string) => value?.replace(/\bFastGPT\b/gi, 'gptGO');
    const sanitizeLink = (value?: string) =>
      value && /fastgpt/i.test(value) ? GPTGO_GITHUB_URL : value;
    const sanitizedConfig: Partial<FastGPTFeConfigsType> = { ...feConfigs };

    if (feConfigs.systemTitle !== undefined) {
      sanitizedConfig.systemTitle = sanitizeText(feConfigs.systemTitle);
    }
    if (feConfigs.concatMd !== undefined) {
      sanitizedConfig.concatMd = /fastgpt/i.test(feConfigs.concatMd)
        ? `项目开源地址: [gptGO GitHub](${GPTGO_GITHUB_URL})`
        : sanitizeText(feConfigs.concatMd);
    }
    if (feConfigs.docUrl !== undefined) {
      sanitizedConfig.docUrl = sanitizeLink(feConfigs.docUrl);
    }
    if (feConfigs.openAPIDocUrl !== undefined) {
      sanitizedConfig.openAPIDocUrl = sanitizeLink(feConfigs.openAPIDocUrl);
    }
    if (feConfigs.loginGuideDocUrl !== undefined) {
      sanitizedConfig.loginGuideDocUrl = sanitizeLink(feConfigs.loginGuideDocUrl);
    }

    return sanitizedConfig;
  };

  const [{ fastgptConfig, licenseData }, pluginRemoteDebug] = await Promise.all([
    getFastGPTConfigFromDB(),
    getPluginRemoteDebugEnabled()
  ]);
  global.licenseData = licenseData;

  const config: FastGPTConfigFileType = {
    feConfigs: {
      ...defaultFeConfigs,
      ...sanitizePublicBrandConfig(fastgptConfig.feConfigs || {}),
      mcpServerProxyEndpoint: appEnv.SSE_MCP_SERVER_PROXY_ENDPOINT,
      limit: {
        ...defaultFeConfigs.limit,
        ...(fastgptConfig.feConfigs?.limit || {})
      },
      isPlus: !!licenseData,
      hideChatCopyrightSetting: appEnv.HIDE_CHAT_COPYRIGHT_SETTING,
      wecomLoginAutoRedirect: appEnv.WECOM_LOGIN_AUTO_REDIRECT,
      show_aiproxy: hasAIProxyApiEndpoint(),
      show_coupon: appEnv.SHOW_COUPON,
      show_discount_coupon: appEnv.SHOW_DISCOUNT_COUPON,
      show_dataset_enhance: licenseData?.functions?.datasetEnhance,
      show_intelligent_chunking: !!serviceEnv.SANGFOR_CHUNK_URL,
      show_batch_eval: licenseData?.functions?.batchEval,
      pluginRemoteDebug,
      payFormUrl: appEnv.PAY_FORM_URL || '',
      marketplaceUrl: appEnv.MARKETPLACE_URL,

      agentSandboxFree: appEnv.AGENT_SANDBOX_FREE_TIP,
      agentSandboxProxyUrl: serviceEnv.AGENT_SANDBOX_PROXY_URL || ''
    },
    systemEnv: Object.assign(
      {
        datasetParseMaxProcess: serviceEnv.DATASET_PARSE_MAX_PROCESS,
        vectorMaxProcess: serviceEnv.VECTOR_MAX_PROCESS,
        qaMaxProcess: serviceEnv.QA_MAX_PROCESS,
        vlmMaxProcess: serviceEnv.VLM_MAX_PROCESS,
        hnswEfSearch: serviceEnv.HNSW_EF_SEARCH,
        hnswMaxScanTuples: serviceEnv.HNSW_MAX_SCAN_TUPLES,
        customPdfParse: {
          url: serviceEnv.CUSTOM_PDF_PARSE_URL,
          key: serviceEnv.CUSTOM_PDF_PARSE_KEY,
          somarkApiKey: serviceEnv.SOMARK_API_KEY,
          doc2xKey: serviceEnv.DOC2X_KEY,
          textinAppId: serviceEnv.TEXTIN_APP_ID,
          textinSecretCode: serviceEnv.TEXTIN_SECRET_CODE
        }
      },
      fastgptConfig.systemEnv || {} // 商业版数据存在数据库里
    ),
    subPlans: fastgptConfig.subPlans
  };

  if (!licenseData) {
    config.feConfigs.loginGuideDocUrl = defaultOpenSourceLoginGuideDocUrl;
  }

  // set config
  initFastGPTConfig(config);

  logger.info('System config loaded', {
    fastgpt: {
      feConfigs: global.feConfigs,
      systemEnv: global.systemEnv,
      subPlans: global.subPlans,
      licenseData: global.licenseData
    }
  });
}

export async function initSystemPluginTags() {
  try {
    const tags = pluginTagList;

    if (tags.length > 0) {
      const bulkOps = tags.map((tag, index) => ({
        updateOne: {
          filter: { tagId: tag.id },
          update: {
            $set: {
              tagId: tag.id,
              tagName: tag.name,
              tagOrder: index,
              isSystem: true
            }
          },
          upsert: true
        }
      }));

      await MongoPluginToolTag.bulkWrite(bulkOps);
    }
  } catch (error) {
    logger.error('Error initializing system plugin tags:', { error });
  }
}

export async function initAppTemplateTypes() {
  try {
    await Promise.all(
      defaultTemplateTypes.map((templateType) => {
        return MongoTemplateTypes.updateOne(
          {
            typeId: templateType.typeId
          },
          {
            $set: {
              typeId: templateType.typeId,
              typeName: templateType.typeName
            }
          },
          {
            upsert: true
          }
        );
      })
    );
  } catch (error) {
    logger.error('Error initializing system templates:', { error });
  }
}
