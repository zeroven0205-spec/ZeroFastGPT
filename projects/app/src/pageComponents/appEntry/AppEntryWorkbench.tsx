import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ChatSourceEnum } from '@fastgpt/global/core/chat/constants';
import { getAppEntryLoginPath, getAppEntryPath } from '@/web/core/appEntry/route';
import { logoutAppEntry } from '@/web/core/appEntry/auth';
import { useChatStore } from '@/web/core/chat/context/useChatStore';
import {
  clearAppEntryHistories,
  loadAppEntryHistories,
  type AppEntryHistoryItem
} from '@/web/core/appEntry/history';
import { useAppEntryBrand } from './AppEntryBrandProvider';
import styles from './AppEntryWorkbench.module.css';

type WorkbenchTab = 'workbench' | 'agents' | 'history';

type Agent = {
  id: string;
  seal: string;
  name: string;
  role: string;
  real: boolean;
};

const AGENTS: Agent[] = [
  { id: 'chief', seal: '灵', name: '首席幕僚', role: '统一调度与分发', real: true },
  { id: 'front-desk', seal: '唐', name: 'AI 前台', role: '电话与消息接待', real: false },
  { id: 'marketing', seal: '俊', name: '营销智能体', role: '营销策略与增长', real: false },
  { id: 'seo', seal: '璐', name: 'SEO 与内容智能体', role: '内容生产与优化', real: false },
  { id: 'sales', seal: '昊', name: '销售智能体', role: '线索跟进与转化', real: false },
  { id: 'finance', seal: '美', name: '财务智能体', role: '经营分析与核算', real: false },
  { id: 'legal', seal: '佳', name: '法务智能体', role: '合同审核与合规', real: false },
  { id: 'recruiting', seal: '睿', name: '招聘智能体', role: '人才筛选与面试', real: false }
];

const Icon = ({ name }: { name: 'home' | 'agents' | 'chat' | 'history' | 'arrow' | 'lock' }) => {
  const paths = {
    home: (
      <>
        <path d="M3 12 12 4l9 8v8a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-8Z" />
      </>
    ),
    agents: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    chat: (
      <>
        <path d="M21 11.5a8 8 0 0 1-8 8H8l-5 3 1.2-4.4A8 8 0 1 1 21 11.5Z" />
      </>
    ),
    history: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 4 5-5" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    lock: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    )
  };

  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const nowTime = () =>
  new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

const AppEntryWorkbench = ({ appKey, appId }: { appKey: string; appId: string }) => {
  const router = useRouter();
  const { brand } = useAppEntryBrand();
  const [tab, setTab] = useState<WorkbenchTab>('workbench');
  const [clock, setClock] = useState('09:41');
  const [toast, setToast] = useState('');
  const [history, setHistory] = useState<AppEntryHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyClearing, setHistoryClearing] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const result = await loadAppEntryHistories({ appId });
      setHistory(result.list);
      setHistoryTotal(result.total);
    } catch {
      setHistoryError('历史记录加载失败，请稍后重试');
    } finally {
      setHistoryLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(nowTime()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;

    void loadAppEntryHistories({ appId })
      .then((result) => {
        if (!active) return;
        setHistory(result.list);
        setHistoryTotal(result.total);
        setHistoryError('');
      })
      .catch(() => {
        if (active) {
          setHistoryError('历史记录加载失败，请稍后重试');
        }
      })
      .finally(() => {
        if (active) {
          setHistoryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appId]);

  const activeAgents = useMemo(() => AGENTS.filter((agent) => agent.real).length, []);
  const displayName = brand.name || '智能体平台';
  const displayDescription = brand.description || '专属智能体，随时为您服务';

  const goToChat = (chatId?: string) => {
    const chatStore = useChatStore.getState();
    chatStore.setSource(ChatSourceEnum.online);
    chatStore.setAppId(appId);
    if (chatId) {
      chatStore.setChatId(chatId);
    }
    void router.push(getAppEntryPath(appKey, 'chat'));
  };

  const handleAgentClick = (agent: Agent) => {
    if (agent.real) {
      goToChat();
      return;
    }
    setToast(`${agent.name} 即将上线`);
  };

  const handleLogout = async () => {
    await logoutAppEntry().catch(() => undefined);
    await router.replace(getAppEntryLoginPath({ appKey, returnTo: getAppEntryPath(appKey) }));
  };

  const clearHistory = async () => {
    if (history.length === 0) {
      setToast('暂无历史记录');
      return;
    }

    if (!window.confirm('确定清空全部历史对话吗？清空后无法恢复。')) return;

    setHistoryClearing(true);
    try {
      await clearAppEntryHistories(appId);
      setHistory([]);
      setHistoryTotal(0);
      setToast('历史已清空');
    } catch {
      setToast('清空失败，请稍后重试');
    } finally {
      setHistoryClearing(false);
    }
  };

  return (
    <div className={styles.shell} aria-label="移动工作台">
      <div className={styles.phone}>
        <div className={styles.statusBar} aria-hidden="true">
          <span>{clock}</span>
          <span className={styles.statusRight}>
            <span>5G</span>
            <span>100%</span>
          </span>
        </div>

        {tab === 'workbench' && (
          <>
            <header className={styles.topbar}>
              <h1 className={styles.topbarTitle}>工作台</h1>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => void handleLogout()}
              >
                退出
              </button>
            </header>
            <main className={styles.content}>
              <section className={styles.hero}>
                <div className={styles.heroGreeting}>
                  您好，<strong>演示用户</strong>
                </div>
                <h2 className={styles.heroTitle}>{displayName}</h2>
                <div className={styles.heroSubtitle}>{displayDescription}</div>
              </section>

              <section className={styles.stats} aria-label="平台概览">
                <div className={styles.stat}>
                  <div className={styles.statNumber}>{AGENTS.length}</div>
                  <div className={styles.statLabel}>智能体</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statNumber}>{historyTotal}</div>
                  <div className={styles.statLabel}>历史对话</div>
                </div>
                <div className={`${styles.stat} ${styles.statBrass}`}>
                  <div className={styles.statNumber}>3</div>
                  <div className={styles.statLabel}>知识文档</div>
                </div>
              </section>

              <div className={styles.sectionTitle}>
                <span>智能体快捷入口</span>
                <button
                  type="button"
                  className={styles.moreButton}
                  onClick={() => setTab('agents')}
                >
                  查看全部
                </button>
              </div>
              <section className={styles.quickAgents} aria-label="智能体快捷入口">
                {AGENTS.slice(0, 4).map((agent) => (
                  <button
                    type="button"
                    key={agent.id}
                    className={`${styles.quickAgent} ${!agent.real ? styles.quickAgentDisabled : ''}`}
                    onClick={() => handleAgentClick(agent)}
                    aria-label={`${agent.name}${agent.real ? '' : '，即将上线'}`}
                  >
                    <span className={styles.seal}>{agent.seal}</span>
                    <span className={styles.quickAgentName}>{agent.name}</span>
                  </button>
                ))}
              </section>

              <div className={styles.sectionTitle}>
                <span>最近对话</span>
                <button
                  type="button"
                  className={styles.moreButton}
                  onClick={() => setTab('history')}
                >
                  查看历史
                </button>
              </div>
              <section className={styles.recentList} aria-label="最近对话">
                {historyLoading ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>正在加载对话…</div>
                  </div>
                ) : historyError ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>{historyError}</div>
                    <button type="button" className={styles.moreButton} onClick={loadHistory}>
                      重新加载
                    </button>
                  </div>
                ) : history.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <Icon name="chat" />
                    </div>
                    <div className={styles.emptyTitle}>暂无对话</div>
                    <div className={styles.emptySubtitle}>试试和首席幕僚聊一聊</div>
                  </div>
                ) : (
                  history.slice(0, 2).map((item) => (
                    <button
                      type="button"
                      className={styles.historyItem}
                      key={item.chatId}
                      onClick={() => goToChat(item.chatId)}
                    >
                      <span className={styles.historyHead}>
                        <span className={styles.historyAgent}>
                          <span className={styles.historyAgentMark}>灵</span>
                          首席幕僚
                        </span>
                        <span className={styles.historyTime}>{item.time}</span>
                      </span>
                      <span className={styles.historyQuestion}>{item.title}</span>
                      <span className={styles.historyAnswer}>点击继续对话</span>
                    </button>
                  ))
                )}
              </section>
            </main>
          </>
        )}

        {tab === 'agents' && (
          <>
            <header className={styles.topbar}>
              <h1 className={styles.topbarTitle}>智能体中心</h1>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => void handleLogout()}
              >
                退出
              </button>
            </header>
            <main className={styles.content}>
              <section className={styles.agentsHeader}>
                <div className={styles.agentsLead}>为您配置的专属智能体</div>
                <div className={styles.agentsSub}>已上线 {activeAgents} 位，其余智能体即将上线</div>
              </section>
              <section className={styles.agentGrid} aria-label="智能体列表">
                {AGENTS.map((agent) => (
                  <button
                    type="button"
                    key={agent.id}
                    className={`${styles.agentCard} ${agent.real ? styles.agentCardReal : styles.agentCardDisabled}`}
                    onClick={() => handleAgentClick(agent)}
                    aria-label={`${agent.name}，${agent.real ? '已上线' : '即将上线'}`}
                  >
                    <span className={styles.agentCardHead}>
                      <span className={styles.seal}>{agent.seal}</span>
                      <span
                        className={`${styles.badge} ${agent.real ? styles.badgeLive : styles.badgeSoon}`}
                      >
                        {agent.real && <span className={styles.badgeDot} />}
                        {agent.real ? '在线' : '即将上线'}
                      </span>
                    </span>
                    <span className={styles.agentCardName}>{agent.name}</span>
                    <span className={styles.agentCardRole}>{agent.role}</span>
                    <span className={styles.agentCardDescription}>
                      {agent.real ? '点击进入智能对话' : '敬请期待'}
                    </span>
                  </button>
                ))}
              </section>
            </main>
          </>
        )}

        {tab === 'history' && (
          <>
            <header className={styles.topbar}>
              <h1 className={styles.topbarTitle}>历史记录</h1>
              <button
                type="button"
                className={styles.actionButton}
                disabled={historyClearing}
                onClick={() => void clearHistory()}
              >
                {historyClearing ? '清空中…' : '清空'}
              </button>
            </header>
            <main className={styles.content}>
              {historyLoading ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyTitle}>正在加载历史记录…</div>
                </div>
              ) : historyError ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyTitle}>{historyError}</div>
                  <button type="button" className={styles.moreButton} onClick={loadHistory}>
                    重新加载
                  </button>
                </div>
              ) : history.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <Icon name="history" />
                  </div>
                  <div className={styles.emptyTitle}>暂无历史对话</div>
                  <div className={styles.emptySubtitle}>和首席幕僚聊一聊试试</div>
                </div>
              ) : (
                <section className={styles.recentList} aria-label="历史记录">
                  {history.map((item) => (
                    <button
                      type="button"
                      className={styles.historyItem}
                      key={item.chatId}
                      onClick={() => goToChat(item.chatId)}
                    >
                      <span className={styles.historyHead}>
                        <span className={styles.historyAgent}>
                          <span className={styles.historyAgentMark}>灵</span>
                          首席幕僚
                        </span>
                        <span className={styles.historyTime}>{item.time}</span>
                      </span>
                      <span className={styles.historyQuestion}>{item.title}</span>
                      <span className={styles.historyAnswer}>点击继续对话</span>
                    </button>
                  ))}
                </section>
              )}
            </main>
          </>
        )}

        <nav className={styles.bottomNav} aria-label="主导航">
          <button
            type="button"
            className={`${styles.navItem} ${tab === 'workbench' ? styles.navItemActive : ''}`}
            onClick={() => setTab('workbench')}
          >
            <Icon name="home" />
            <span>工作台</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${tab === 'agents' ? styles.navItemActive : ''}`}
            onClick={() => setTab('agents')}
          >
            <Icon name="agents" />
            <span>智能体</span>
          </button>
          <button type="button" className={styles.navItem} onClick={() => goToChat()}>
            <Icon name="chat" />
            <span>灵</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${tab === 'history' ? styles.navItemActive : ''}`}
            onClick={() => setTab('history')}
          >
            <Icon name="history" />
            <span>历史</span>
          </button>
        </nav>

        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
};

export default React.memo(AppEntryWorkbench);
