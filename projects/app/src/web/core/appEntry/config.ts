import type { AppEntryConfig } from './type';

/**
 * AppEntry 技术骨架使用的临时配置。
 * 真实 AppKey 映射、品牌配置和启用状态由 S1-03 的服务端配置解析替换。
 */
export const getAppEntryPlaceholderConfig = ({ appKey }: { appKey: string }): AppEntryConfig => ({
  appKey,
  appId: '',
  enabled: true,
  brand: {
    name: '应用入口',
    description: '业务应用入口',
    logo: '',
    favicon: '',
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
