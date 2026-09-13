import type { AppWhisperConfigType } from '@fastgpt/global/core/app/type';
import type { ChatBoxFeatures } from '@/components/core/chat/ChatContainer/ChatBox';
import type { ChatBoxPresentation } from '@/components/core/chat/ChatContainer/ChatBox/Provider';
import type { AppEntryBrandConfig, AppEntryFeatures } from './type';
import { sanitizeAppEntryError } from './error';

/** 将 AppEntry 固定能力边界转换为共享 ChatBox 的 feature props。 */
export const getAppEntryChatBoxFeatures = ({
  features
}: {
  features: AppEntryFeatures;
}): ChatBoxFeatures => ({
  autoResume: true,
  feedbackType: 'hidden',
  fileUpload: features.allowFileUpload,
  inputGuide: true,
  mark: false,
  markRead: true,
  quickReplies: true,
  sandbox: false,
  tts: false,
  voice: features.allowVoiceInput,
  workorder: false
});

/**
 * AppEntry 的语音开关由业务入口配置决定，不依赖管理端是否打开 Chat 页语音按钮。
 * 仍保留 App 已配置的 autoSend 等行为，但固定关闭自动 TTS，避免引入一期范围外能力。
 */
export const getAppEntryWhisperConfig = ({
  features,
  whisperConfig
}: {
  features: AppEntryFeatures;
  whisperConfig?: AppWhisperConfigType;
}): AppWhisperConfigType => ({
  ...whisperConfig,
  open: features.allowVoiceInput,
  autoSend: whisperConfig?.autoSend ?? false,
  autoTTSResponse: false
});

/** 为共享 ChatBox 注入 AppEntry 专属可见文案和错误映射，普通 Chat 不传入时保持原行为。 */
export const getAppEntryChatBoxPresentation = ({
  brand
}: {
  brand: AppEntryBrandConfig;
}): ChatBoxPresentation => ({
  inputPlaceholder: `发消息给${brand.name}`,
  agentAskCustomAnswer: '请输入补充内容',
  showComplianceTip: false,
  errorTitle: '请求未完成',
  formatError: sanitizeAppEntryError
});
