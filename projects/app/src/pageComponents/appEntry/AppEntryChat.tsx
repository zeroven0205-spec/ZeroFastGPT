import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  Spinner,
  Text
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useContextSelector } from 'use-context-selector';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import {
  ChatSourceEnum,
  ChatSourceTypeEnum,
  GetChatTypeEnum
} from '@fastgpt/global/core/chat/constants';
import { ChatErrEnum } from '@fastgpt/global/common/error/code/chat';
import { AppErrEnum } from '@fastgpt/global/common/error/code/app';
import MyIcon from '@fastgpt/web/components/common/Icon';
import ChatBox from '@/components/core/chat/ChatContainer/ChatBox';
import { ChatTypeEnum } from '@/components/core/chat/ChatContainer/ChatBox/constants';
import type { StartChatFnProps } from '@/components/core/chat/ChatContainer/type';
import ChatContextProvider, { ChatContext } from '@/web/core/chat/context/chatContext';
import ChatItemContextProvider, { ChatItemContext } from '@/web/core/chat/context/chatItemContext';
import ChatRecordContextProvider from '@/web/core/chat/context/chatRecordContext';
import { useChatStore } from '@/web/core/chat/context/useChatStore';
import { getInitChatInfo } from '@/web/core/chat/api';
import { postMarkChatRead } from '@/web/core/chat/history/api';
import { streamFetch } from '@/web/common/api/fetch';
import { getAppChatSourceKey } from '@/web/core/chat/utils';
import { getDisplayHistoryTitle } from '@/web/core/chat/context/historyTitleUtils';
import { useAppChatGenerateStatusSync } from '@/pageComponents/chat/ChatWindow/useAppChatGenerateStatusSync';
import ChatSliderList from '@/pageComponents/chat/slider/ChatSliderList';
import ChatQuoteList from '@/pageComponents/chat/ChatQuoteList';
import { getAppEntryLoginPath, getAppEntryPath } from '@/web/core/appEntry/route';
import { logoutAppEntry } from '@/web/core/appEntry/auth';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import type { AppEntryPublicConfig } from '@/web/core/appEntry/type';
import {
  getAppEntryChatBoxFeatures,
  getAppEntryChatBoxPresentation,
  getAppEntryWhisperConfig
} from '@/web/core/appEntry/chat';
import { AppEntryBrandMark } from './AppEntryBrandMark';

type Props = {
  appKey: string;
  appId: string;
  config: AppEntryPublicConfig;
};

const AppEntryHistoryDrawer = ({
  appKey,
  brand
}: {
  appKey: string;
  brand: AppEntryPublicConfig['brand'];
}) => {
  const router = useRouter();
  const isOpen = useContextSelector(ChatContext, (v) => v.isOpenSlider);
  const onClose = useContextSelector(ChatContext, (v) => v.onCloseSlider);
  const onChangeChatId = useContextSelector(ChatContext, (v) => v.onChangeChatId);
  const clearChatRecords = useContextSelector(ChatItemContext, (v) => v.clearChatRecords);
  const setCiteModalData = useContextSelector(ChatItemContext, (v) => v.setCiteModalData);
  const [loggingOut, setLoggingOut] = useState(false);

  const newChat = () => {
    clearChatRecords();
    onChangeChatId(getNanoid(24));
    setCiteModalData(undefined);
  };

  return (
    <Drawer placement="left" size="xs" autoFocus={false} isOpen={isOpen} onClose={onClose}>
      <DrawerOverlay bg="blackAlpha.300" />
      <DrawerContent maxW="min(86vw, 360px)" pt="env(safe-area-inset-top)">
        <DrawerHeader px="16px" py="14px" borderBottom="1px solid" borderColor="gray.100">
          <Flex align="center" gap="10px">
            <AppEntryBrandMark brand={brand} size="30px" />
            <Text minW={0} flex="1" fontSize="16px" noOfLines={1}>
              {brand.name}
            </Text>
            <IconButton
              aria-label="关闭历史会话"
              variant="ghost"
              size="sm"
              icon={<MyIcon name="close" w="18px" />}
              onClick={onClose}
            />
          </Flex>
          <Button
            mt="14px"
            w="100%"
            color="white"
            bg={brand.primaryColor}
            _hover={{ bg: brand.primaryColor }}
            leftIcon={<MyIcon name="core/chat/chatLight" w="16px" color="white" />}
            onClick={newChat}
          >
            新建会话
          </Button>
        </DrawerHeader>

        <DrawerBody display="flex" flexDirection="column" minH={0} px="16px" py="14px">
          <ChatSliderList />
        </DrawerBody>

        <DrawerFooter
          px="16px"
          pt="12px"
          pb="calc(12px + env(safe-area-inset-bottom))"
          borderTop="1px solid"
          borderColor="gray.100"
        >
          <Button
            w="100%"
            variant="ghost"
            color="gray.600"
            isLoading={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              await logoutAppEntry().catch(() => undefined);
              await router.replace(
                getAppEntryLoginPath({
                  appKey,
                  returnTo: getAppEntryPath(appKey, 'chat')
                })
              );
            }}
          >
            退出登录
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

const AppEntryChatWindow = ({ appKey, appId, config }: Props) => {
  const router = useRouter();
  const chatId = useChatStore((state) => state.chatId);
  const forbidLoadChatRef = useContextSelector(ChatContext, (v) => v.forbidLoadChat);
  const onOpenHistory = useContextSelector(ChatContext, (v) => v.onOpenSlider);
  const onChangeChatId = useContextSelector(ChatContext, (v) => v.onChangeChatId);
  const currentHistory = useContextSelector(ChatContext, (v) =>
    v.histories.find((item) => item.chatId === chatId && item.appId === appId)
  );
  const chatBoxData = useContextSelector(ChatItemContext, (v) => v.chatBoxData);
  const setChatBoxData = useContextSelector(ChatItemContext, (v) => v.setChatBoxData);
  const resetVariables = useContextSelector(ChatItemContext, (v) => v.resetVariables);
  const clearChatRecords = useContextSelector(ChatItemContext, (v) => v.clearChatRecords);
  const datasetCiteData = useContextSelector(ChatItemContext, (v) => v.datasetCiteData);
  const setCiteModalData = useContextSelector(ChatItemContext, (v) => v.setCiteModalData);
  const resetChatItemUIState = useContextSelector(ChatItemContext, (v) => v.resetUIState);
  const onChatGenerateStatusChange = useAppChatGenerateStatusSync();
  const [loadError, setLoadError] = useState('');

  const isCurrentChatReady =
    chatBoxData.appId === appId && chatBoxData.chatId === chatId && !!chatId;
  const title = getDisplayHistoryTitle({
    customTitle: currentHistory?.customTitle,
    title: isCurrentChatReady ? chatBoxData.title : undefined,
    fallbackTitle: config.brand.name
  });

  const { loading, runAsync: loadChat } = useRequest(
    async () => {
      if (!appId || !chatId || forbidLoadChatRef.current) return;

      const response = await getInitChatInfo({ appId, chatId });
      setChatBoxData({
        ...response,
        appId,
        sourceKey: getAppChatSourceKey(appId),
        app: {
          ...response.app,
          name: config.brand.name,
          avatar: config.brand.logo,
          intro: config.brand.description,
          chatConfig: {
            ...response.app.chatConfig,
            whisperConfig: getAppEntryWhisperConfig({
              features: config.features,
              whisperConfig: response.app.chatConfig?.whisperConfig
            })
          }
        }
      });
      resetVariables({
        variables: response.variables,
        variableList: response.app?.chatConfig?.variables
      });
    },
    {
      manual: false,
      refreshDeps: [appId, chatId],
      onBefore() {
        setLoadError('');
        resetChatItemUIState();
      },
      onError(error: any) {
        if (error?.statusText === ChatErrEnum.unAuthChat) {
          clearChatRecords();
          onChangeChatId();
          return;
        }
        if (error?.statusText === AppErrEnum.unAuthApp) {
          void router.replace(
            getAppEntryLoginPath({ appKey, returnTo: getAppEntryPath(appKey, 'chat') })
          );
          return;
        }
        setLoadError('会话加载失败，请检查网络后重试。');
      },
      onFinally() {
        forbidLoadChatRef.current = false;
      }
    }
  );

  const onStartChat = useCallback(
    async ({
      messages,
      variables,
      controller,
      responseChatItemId,
      generatingMessage
    }: StartChatFnProps) => {
      const { responseText } = await streamFetch({
        data: {
          messages: messages.slice(-1),
          variables,
          responseChatItemId,
          appId,
          chatId,
          retainDatasetCite: config.features.showCitation,
          showSkillReferences: false
        },
        abortCtrl: controller,
        onMessage: generatingMessage
      });

      return { responseText };
    },
    [appId, chatId, config.features.showCitation]
  );

  const newChat = () => {
    clearChatRecords();
    onChangeChatId();
    setCiteModalData(undefined);
  };

  return (
    <Flex position="relative" h="100%" minH={0} minW={0} direction="column" overflow="hidden">
      <Flex
        as="header"
        flex="0 0 auto"
        h="54px"
        minW={0}
        align="center"
        gap="4px"
        px="8px"
        borderBottom="1px solid"
        borderColor="gray.100"
        bg="white"
      >
        <IconButton
          aria-label="返回首页"
          variant="ghost"
          size="sm"
          icon={<MyIcon name="common/backLight" w="18px" />}
          onClick={() => void router.push(getAppEntryPath(appKey))}
        />
        {config.features.showHistory && (
          <IconButton
            aria-label="历史会话"
            variant="ghost"
            size="sm"
            icon={<MyIcon name="core/chat/sidebar/menu" w="19px" />}
            onClick={onOpenHistory}
          />
        )}
        <Text minW={0} flex="1" px="6px" fontSize="15px" fontWeight="600" noOfLines={1}>
          {title}
        </Text>
        <Button variant="ghost" size="sm" px="10px" onClick={newChat}>
          新建
        </Button>
      </Flex>

      <Box flex="1 1 auto" minH={0} minW={0} overflow="hidden" bg="white">
        <ChatBox
          sourceTarget={{ sourceType: ChatSourceTypeEnum.app, sourceId: appId }}
          chatId={chatId}
          isReady={!loading && isCurrentChatReady}
          features={getAppEntryChatBoxFeatures({ features: config.features })}
          presentation={getAppEntryChatBoxPresentation({ brand: config.brand })}
          chatType={ChatTypeEnum.chat}
          inputBodyProps={{
            px: '12px',
            pb: 'calc(12px + env(safe-area-inset-bottom))',
            maxW: '100%'
          }}
          boxBodyProps={{ px: '12px', pb: '16px', maxW: '100%' }}
          onStartChat={onStartChat}
          onMarkChatRead={postMarkChatRead}
          onChatGenerateStatusChange={onChatGenerateStatusChange}
        />

        {(loading && !isCurrentChatReady) || loadError ? (
          <Flex
            position="absolute"
            inset="54px 0 0"
            zIndex={5}
            direction="column"
            align="center"
            justify="center"
            gap="14px"
            px="24px"
            bg="white"
          >
            {loading && !loadError ? (
              <>
                <Spinner color={config.brand.primaryColor} />
                <Text color="gray.500" fontSize="14px">
                  正在加载会话…
                </Text>
              </>
            ) : (
              <>
                <Text color="gray.600" fontSize="14px" textAlign="center">
                  {loadError}
                </Text>
                <Button
                  color="white"
                  bg={config.brand.primaryColor}
                  _hover={{ bg: config.brand.primaryColor }}
                  onClick={() => void loadChat()}
                >
                  重新加载
                </Button>
              </>
            )}
          </Flex>
        ) : null}
      </Box>

      {config.features.showHistory && (
        <AppEntryHistoryDrawer appKey={appKey} brand={config.brand} />
      )}

      {config.features.showCitation && datasetCiteData && (
        <Flex position="absolute" inset={0} zIndex={20} direction="column" bg="white">
          <ChatQuoteList
            metadata={datasetCiteData.metadata}
            rawSearch={datasetCiteData.rawSearch}
            singleQuote={datasetCiteData.singleQuote}
            onClose={() => setCiteModalData(undefined)}
          />
        </Flex>
      )}
    </Flex>
  );
};

/**
 * AppEntry H5 Chat 装配层。
 * 只负责把已由服务端解析的 App、现有 Chat Context 和移动端外壳连接起来，不复制生成引擎。
 */
export const AppEntryChat = ({ appKey, appId, config }: Props) => {
  const loaded = useChatStore((state) => state.loaded);
  const source = useChatStore((state) => state.source);
  const currentAppId = useChatStore((state) => state.appId);
  const chatId = useChatStore((state) => state.chatId);
  const setSource = useChatStore((state) => state.setSource);
  const setAppId = useChatStore((state) => state.setAppId);
  const setChatId = useChatStore((state) => state.setChatId);
  const setOutLinkAuthData = useChatStore((state) => state.setOutLinkAuthData);

  useEffect(() => {
    if (!loaded) return;

    setOutLinkAuthData({});
    setSource(ChatSourceEnum.online);
    setAppId(appId);
    if (!useChatStore.getState().chatId) {
      setChatId();
    }
  }, [appId, loaded, setAppId, setChatId, setOutLinkAuthData, setSource]);

  useEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-entry-viewport-height', `${height}px`);
    };

    updateViewportHeight();
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      document.documentElement.style.removeProperty('--app-entry-viewport-height');
    };
  }, []);

  const isStoreReady =
    loaded &&
    source === ChatSourceEnum.online &&
    currentAppId === appId &&
    typeof chatId === 'string' &&
    chatId.length > 0;

  const chatHistoryParams = useMemo(() => ({ appId, source: ChatSourceEnum.online }), [appId]);
  const chatRecordParams = useMemo(
    () => ({ appId, chatId, type: GetChatTypeEnum.normal }),
    [appId, chatId]
  );

  if (!isStoreReady) {
    return (
      <Flex h="100%" align="center" justify="center" gap="12px" color="gray.500">
        <Spinner color={config.brand.primaryColor} />
        <Text fontSize="14px">正在准备会话…</Text>
      </Flex>
    );
  }

  return (
    <ChatContextProvider params={chatHistoryParams}>
      <ChatItemContextProvider
        showRouteToDatasetDetail={false}
        canDownloadSource={false}
        isShowCite={config.features.showCitation}
        isShowFullText={config.features.showCitation}
        showRunningStatus
        showSkillReferences={false}
        showWholeResponse={false}
        showPoints={false}
        showSandboxAction={false}
      >
        <ChatRecordContextProvider params={chatRecordParams}>
          <AppEntryChatWindow appKey={appKey} appId={appId} config={config} />
        </ChatRecordContextProvider>
      </ChatItemContextProvider>
    </ChatContextProvider>
  );
};
