import { ChatSourceEnum } from '@fastgpt/global/core/chat/constants';
import { formatTimeToChatTime } from '@fastgpt/global/common/string/time';
import type { GetHistoriesResponseType } from '@fastgpt/global/openapi/core/chat/history/api';
import { delClearChatHistories, getChatHistories } from '@/web/core/chat/history/api';

export type AppEntryHistoryItem = {
  chatId: string;
  title: string;
  time: string;
};

/**
 * 将共享聊天历史转换为移动工作台展示结构。
 * 自定义标题仅在非空时覆盖自动标题，避免空白标题导致列表看起来没有内容。
 */
export const mapAppEntryHistoryItem = (
  item: GetHistoriesResponseType['list'][number]
): AppEntryHistoryItem => ({
  chatId: item.chatId,
  title: item.customTitle?.trim() || item.title,
  time: formatTimeToChatTime(new Date(item.updateTime))
});

/** 加载当前 AppEntry 对应应用的线上会话，返回首屏列表及服务端总数。 */
export const loadAppEntryHistories = async ({
  appId,
  pageSize = 20
}: {
  appId: string;
  pageSize?: number;
}) => {
  const result = await getChatHistories({
    appId,
    source: ChatSourceEnum.online,
    pageNum: 1,
    pageSize
  });

  return {
    list: result.list.map(mapAppEntryHistoryItem),
    total: result.total
  };
};

/** 清空当前 AppEntry 应用下、当前登录成员可见的全部线上会话。 */
export const clearAppEntryHistories = (appId: string) =>
  delClearChatHistories({
    appId
  });
