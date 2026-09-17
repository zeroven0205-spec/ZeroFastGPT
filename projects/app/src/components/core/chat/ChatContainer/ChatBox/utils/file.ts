import { ChatFileTypeEnum, ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import { isChatFileAllowedBySelectConfig as isGlobalChatFileAllowedBySelectConfig } from '@fastgpt/global/core/app/constants';
import type { AppFileSelectConfigType } from '@fastgpt/global/core/app/type/config.schema';
import { ChatTypeEnum } from '../constants';

/**
 * 决定 Chat 文件上传使用正式策略还是客户端草稿策略。
 * 只有编辑态测试使用临时配置；Home Chat 和 Helper 都是服务端授权的正式运行态。
 */
export const resolveChatFileUploadMode = ({
  chatType,
  sourceType
}: {
  chatType: ChatTypeEnum;
  sourceType: ChatSourceTypeEnum;
}): 'runtime' | 'draft' => {
  if (sourceType === ChatSourceTypeEnum.chatAgentHelper) return 'runtime';
  if (chatType === ChatTypeEnum.test) return 'draft';
  return 'runtime';
};

/**
 * 根据页面级能力开关收敛 App 的文件选择配置。
 * 关闭时保留无关字段，但显式关闭所有入口，确保选择、拖拽和粘贴路径得到同一结果。
 */
export const resolveChatFileSelectConfig = ({
  fileSelectConfig,
  enabled
}: {
  fileSelectConfig: AppFileSelectConfigType;
  enabled: boolean;
}): AppFileSelectConfigType =>
  enabled
    ? fileSelectConfig
    : {
        ...fileSelectConfig,
        maxFiles: 0,
        canSelectFile: false,
        canSelectImg: false,
        customPdfParse: false,
        canSelectVideo: false,
        canSelectAudio: false,
        canSelectCustomFileExtension: false,
        customFileExtensionList: []
      };

export const getUploadChatFileType = (file: File) => {
  if (file.type.includes('image')) return ChatFileTypeEnum.image;
  if (file.type.includes('audio')) return ChatFileTypeEnum.audio;
  if (file.type.includes('video')) return ChatFileTypeEnum.video;
  return ChatFileTypeEnum.file;
};

/**
 * 按 Chat 文件选择配置判断拖拽或粘贴文件是否允许上传。
 *
 * 优先使用文件名后缀，与文件选择器的 accept 和服务端上传策略保持一致。只有文件名没有
 * 后缀时，才根据 MIME 大类兼容剪贴板或浏览器生成的匿名媒体文件。
 */
export const isChatFileAllowedBySelectConfig = ({
  file,
  fileSelectConfig
}: {
  file: Pick<File, 'name' | 'type'>;
  fileSelectConfig: AppFileSelectConfigType;
}) => {
  return isGlobalChatFileAllowedBySelectConfig({
    filename: file.name,
    contentType: file.type,
    fileType: getUploadChatFileType(file as File),
    fileSelectConfig
  });
};
