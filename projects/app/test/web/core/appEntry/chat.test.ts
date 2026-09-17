import { describe, expect, it } from 'vitest';
import {
  getAppEntryChatBoxFeatures,
  getAppEntryChatBoxPresentation,
  getAppEntryWhisperConfig
} from '@/web/core/appEntry/chat';

const features = {
  showHistory: true,
  allowFileUpload: false,
  allowVoiceInput: true,
  showCitation: true,
  showFeedback: false,
  allowRegister: false
};

describe('AppEntry Chat feature adapter', () => {
  it('keeps MVP capabilities enabled and explicitly disables excluded Chat features', () => {
    expect(getAppEntryChatBoxFeatures({ features })).toMatchObject({
      autoResume: true,
      feedbackType: 'hidden',
      fileUpload: false,
      voice: true,
      tts: false,
      sandbox: false,
      workorder: false,
      mark: false
    });
  });

  it('injects white-label presentation without shared platform wording', () => {
    const presentation = getAppEntryChatBoxPresentation({
      brand: {
        name: '业务助手',
        description: '',
        logo: '/brand/logo.svg',
        favicon: '/brand/favicon.ico',
        primaryColor: '#123456'
      }
    });

    expect(presentation).toMatchObject({
      inputPlaceholder: '发消息给业务助手',
      agentAskCustomAnswer: '请输入补充内容',
      showComplianceTip: false,
      errorTitle: '请求未完成'
    });
    expect(presentation.formatError?.(new Error('redis://internal'), 'fallback')).toBe(
      '暂时无法完成请求，请稍后重试。'
    );
    expect(JSON.stringify(presentation)).not.toMatch(/fastgpt|ai platform/i);
  });

  it('forces voice availability from AppEntry config without enabling auto TTS', () => {
    expect(
      getAppEntryWhisperConfig({
        features,
        whisperConfig: {
          open: false,
          autoSend: true,
          autoTTSResponse: true
        }
      })
    ).toEqual({
      open: true,
      autoSend: true,
      autoTTSResponse: false
    });
  });

  it('closes voice input when the AppEntry feature is disabled', () => {
    expect(
      getAppEntryWhisperConfig({
        features: { ...features, allowVoiceInput: false },
        whisperConfig: {
          open: true,
          autoSend: false,
          autoTTSResponse: true
        }
      })
    ).toMatchObject({ open: false, autoTTSResponse: false });
  });
});
