const DEFAULT_APP_ENTRY_ERROR_MESSAGE = '暂时无法完成请求，请稍后重试。';
const NETWORK_ERROR_MESSAGE = '网络连接异常，请检查网络后重试。';
const TIMEOUT_ERROR_MESSAGE = '请求超时，请稍后重试。';
const AUTH_ERROR_MESSAGE = '登录状态已失效，请重新进入。';
const STREAM_ERROR_MESSAGE = '连接已中断，请重试。';
const MICROPHONE_PERMISSION_ERROR_MESSAGE = '未获得麦克风权限，请在系统设置中允许后重试。';

const NETWORK_ERROR_PATTERN =
  /(?:network|failed to fetch|fetch failed|econnrefused|econnreset|enotfound|dns|socket|connection)/i;
const TIMEOUT_ERROR_PATTERN = /(?:timeout|timed out|etimedout)/i;
const AUTH_ERROR_PATTERN = /(?:unauthori[sz]ed|unauthorization|unauthapp|invalid auth|401|403)/i;
const STREAM_ERROR_PATTERN = /(?:stream|eventsource|sse|connection closed|premature close)/i;
const MICROPHONE_PERMISSION_ERROR_PATTERN =
  /(?:notallowederror|permission denied|permission dismissed|microphone permission|media permission)/i;
const getRawErrorText = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (!error || typeof error !== 'object') return '';

  const record = error as Record<string, unknown>;
  const candidates = [
    record.statusText,
    record.message,
    record.errorText,
    record.msg,
    record.code,
    record.responseText
  ];

  return candidates.find((value): value is string => typeof value === 'string') ?? '';
};

/**
 * 将任意 AppEntry 可见错误映射到有限的中性消息。
 * 原始错误仅用于分类，URL、服务名、路径、堆栈和凭证内容不会拼接回页面。
 */
export const sanitizeAppEntryError = (
  error: unknown,
  _fallback = DEFAULT_APP_ENTRY_ERROR_MESSAGE
): string => {
  const rawErrorText = getRawErrorText(error);

  if (MICROPHONE_PERMISSION_ERROR_PATTERN.test(rawErrorText)) {
    return MICROPHONE_PERMISSION_ERROR_MESSAGE;
  }
  if (AUTH_ERROR_PATTERN.test(rawErrorText)) return AUTH_ERROR_MESSAGE;
  if (TIMEOUT_ERROR_PATTERN.test(rawErrorText)) return TIMEOUT_ERROR_MESSAGE;
  if (STREAM_ERROR_PATTERN.test(rawErrorText)) return STREAM_ERROR_MESSAGE;
  if (NETWORK_ERROR_PATTERN.test(rawErrorText)) return NETWORK_ERROR_MESSAGE;

  return DEFAULT_APP_ENTRY_ERROR_MESSAGE;
};
