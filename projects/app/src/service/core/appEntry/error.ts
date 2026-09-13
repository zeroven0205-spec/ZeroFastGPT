import { ERROR_RESPONSE } from '@fastgpt/global/common/error/errorCode';
import { UserError } from '@fastgpt/global/common/error/utils';
import { sanitizeAppEntryError } from '@/web/core/appEntry/error';
import { getLogger, LogCategories } from '@fastgpt/service/common/logger';

const logger = getLogger(LogCategories.MODULE.APP);

const getErrorCode = (error: unknown) => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return '';
};

/**
 * AppEntry 专属 API 错误边界。
 * 保留已登记的公开业务错误码；未登记异常统一返回中性消息，详细错误仍由服务端日志记录。
 */
export const withAppEntryPublicError = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    if (ERROR_RESPONSE[getErrorCode(error)]) {
      throw error;
    }

    logger.error('AppEntry public request failed', { error });
    throw new UserError('app_entry_request_failed', sanitizeAppEntryError(error));
  }
};
