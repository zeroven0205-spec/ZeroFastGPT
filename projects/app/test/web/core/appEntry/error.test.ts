import { describe, expect, it } from 'vitest';
import { sanitizeAppEntryError } from '@/web/core/appEntry/error';

describe('AppEntry visible error sanitizer', () => {
  it.each([
    new Error('MongoServerError at /Users/admin/project/node_modules/mongoose'),
    'Redis connection failed at redis://internal-cache:6379',
    { message: 'Docker container fastgpt-app failed', responseText: 'secret-token=abc' },
    { message: 'https://internal.example/api returned 500' }
  ])('never returns internal details for %o', (error) => {
    const message = sanitizeAppEntryError(error);

    expect([
      '暂时无法完成请求，请稍后重试。',
      '网络连接异常，请检查网络后重试。',
      '请求超时，请稍后重试。',
      '连接已中断，请重试。'
    ]).toContain(message);
    expect(message).not.toMatch(/mongo|redis|docker|fastgpt|https?:|token|\/Users\//i);
  });

  it('maps common recoverable failures to finite neutral messages', () => {
    expect(sanitizeAppEntryError(new Error('ETIMEDOUT from upstream'))).toBe(
      '请求超时，请稍后重试。'
    );
    expect(sanitizeAppEntryError(new Error('Failed to fetch'))).toBe(
      '网络连接异常，请检查网络后重试。'
    );
    expect(sanitizeAppEntryError(new Error('SSE stream closed'))).toBe('连接已中断，请重试。');
    expect(sanitizeAppEntryError(new Error('401 Unauthorized'))).toBe(
      '登录状态已失效，请重新进入。'
    );
    expect(sanitizeAppEntryError(new DOMException('Permission denied', 'NotAllowedError'))).toBe(
      '未获得麦克风权限，请在系统设置中允许后重试。'
    );
  });

  it('rejects an unsafe caller fallback', () => {
    expect(sanitizeAppEntryError('unknown', 'FastGPT failed at http://localhost:3000')).toBe(
      '暂时无法完成请求，请稍后重试。'
    );
  });
});
