import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSourceEnum } from '@fastgpt/global/core/chat/constants';

const mocks = vi.hoisted(() => ({
  getChatHistories: vi.fn(),
  delClearChatHistories: vi.fn()
}));

vi.mock('@/web/core/chat/history/api', () => ({
  getChatHistories: mocks.getChatHistories,
  delClearChatHistories: mocks.delClearChatHistories
}));

import {
  clearAppEntryHistories,
  loadAppEntryHistories,
  mapAppEntryHistoryItem
} from '@/web/core/appEntry/history';

describe('AppEntry history adapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T15:00:00+08:00'));
    mocks.getChatHistories.mockReset();
    mocks.delClearChatHistories.mockReset();
  });

  it('maps a non-empty custom title and formats a same-day update time', () => {
    expect(
      mapAppEntryHistoryItem({
        appId: 'app-id',
        chatId: 'chat-id',
        customTitle: '  自定义标题  ',
        title: '自动标题',
        updateTime: new Date('2026-09-14T14:30:00+08:00')
      })
    ).toEqual({
      chatId: 'chat-id',
      title: '自定义标题',
      time: '14:30'
    });
  });

  it('falls back to the generated title when the custom title is blank', () => {
    expect(
      mapAppEntryHistoryItem({
        appId: 'app-id',
        chatId: 'chat-id',
        customTitle: '   ',
        title: '自动标题',
        updateTime: new Date('2026-09-13T14:30:00+08:00')
      }).title
    ).toBe('自动标题');
  });

  it('loads online histories for the AppEntry app and preserves the server total', async () => {
    mocks.getChatHistories.mockResolvedValue({
      total: 25,
      list: [
        {
          appId: 'app-id',
          chatId: 'chat-id',
          title: '刚才的对话',
          updateTime: '2026-09-14T06:30:00.000Z'
        }
      ]
    });

    await expect(loadAppEntryHistories({ appId: 'app-id' })).resolves.toEqual({
      total: 25,
      list: [{ chatId: 'chat-id', title: '刚才的对话', time: '14:30' }]
    });
    expect(mocks.getChatHistories).toHaveBeenCalledExactlyOnceWith({
      appId: 'app-id',
      source: ChatSourceEnum.online,
      pageNum: 1,
      pageSize: 20
    });
  });

  it('supports a smaller first-page size and clears the same app target', async () => {
    mocks.getChatHistories.mockResolvedValue({ total: 0, list: [] });
    mocks.delClearChatHistories.mockResolvedValue(undefined);

    await loadAppEntryHistories({ appId: 'app-id', pageSize: 2 });
    await clearAppEntryHistories('app-id');

    expect(mocks.getChatHistories).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 2 }));
    expect(mocks.delClearChatHistories).toHaveBeenCalledExactlyOnceWith({ appId: 'app-id' });
  });
});
