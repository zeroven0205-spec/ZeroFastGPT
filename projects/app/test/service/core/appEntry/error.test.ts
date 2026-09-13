import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrEnum } from '@fastgpt/global/common/error/code/app';
import { UserError } from '@fastgpt/global/common/error/utils';

const mocks = vi.hoisted(() => ({ logger: { error: vi.fn() } }));

vi.mock('@fastgpt/service/common/logger', () => ({
  getLogger: () => mocks.logger,
  LogCategories: { MODULE: { APP: ['app'] } }
}));

const { withAppEntryPublicError } = await import('@/service/core/appEntry/error');

describe('AppEntry public API error boundary', () => {
  beforeEach(() => {
    mocks.logger.error.mockReset();
  });

  it('preserves registered public business error codes', async () => {
    await expect(
      withAppEntryPublicError(async () => Promise.reject(AppErrEnum.unAuthApp))
    ).rejects.toBe(AppErrEnum.unAuthApp);
    expect(mocks.logger.error).not.toHaveBeenCalled();
  });

  it('logs internal failures and exposes only a neutral UserError', async () => {
    const internalError = new Error('MongoDB at mongodb://internal:27017 failed');
    const error = await withAppEntryPublicError(async () => Promise.reject(internalError)).catch(
      (caught) => caught
    );

    expect(error).toBeInstanceOf(UserError);
    expect(error.message).toBe('app_entry_request_failed');
    expect(error.displayMessage).toBe('暂时无法完成请求，请稍后重试。');
    expect(error.displayMessage).not.toMatch(/mongo|internal|27017/i);
    expect(mocks.logger.error).toHaveBeenCalledWith('AppEntry public request failed', {
      error: internalError
    });
  });
});
