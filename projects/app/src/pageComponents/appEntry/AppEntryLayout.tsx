import React from 'react';
import { Box, Flex, IconButton, type BoxProps } from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import type { AppEntryBrandConfig } from '@/web/core/appEntry/type';
import { getAppEntryDisplayBrand, getAppEntryThemeCssVariables } from '@/web/core/appEntry/brand';
import { AppEntryBrandProvider } from './AppEntryBrandProvider';
import { AppEntryBrandMark } from './AppEntryBrandMark';
import { AppEntryErrorBoundary } from './AppEntryErrorBoundary';

type Props = {
  brand: AppEntryBrandConfig;
  children: React.ReactNode;
  showHeader?: boolean;
  onBack?: () => void;
  contentOverflow?: BoxProps['overflow'];
  contentPaddingBottom?: BoxProps['paddingBottom'];
};

/**
 * AppEntry 独立 H5 外壳。
 * 不挂载平台 Layout/Navbar/通知/SupportBot，只提供业务页面需要的 Header、内容区和安全区。
 */
const AppEntryLayout = ({
  brand,
  children,
  showHeader = true,
  onBack,
  contentOverflow = 'auto',
  contentPaddingBottom = 'env(safe-area-inset-bottom)'
}: Props) => {
  const displayBrand = getAppEntryDisplayBrand(brand);

  return (
    <AppEntryBrandProvider brand={displayBrand}>
      <AppEntryErrorBoundary brand={displayBrand}>
        <Flex
          minH="var(--app-entry-viewport-height, 100dvh)"
          h="var(--app-entry-viewport-height, 100dvh)"
          w="100%"
          maxW="100vw"
          direction="column"
          bg="white"
          color="gray.800"
          overflow="hidden"
          overflowX="hidden"
          pt="env(safe-area-inset-top)"
          style={getAppEntryThemeCssVariables(displayBrand.primaryColor) as React.CSSProperties}
        >
          {showHeader && (
            <Flex
              as="header"
              flex="0 0 auto"
              h="56px"
              align="center"
              gap="12px"
              px="16px"
              borderBottom="1px solid"
              borderColor="gray.100"
            >
              {onBack && (
                <IconButton
                  aria-label="返回"
                  variant="ghost"
                  size="sm"
                  icon={<MyIcon name="common/backLight" w="18px" h="18px" />}
                  onClick={onBack}
                />
              )}
              <AppEntryBrandMark brand={displayBrand} />
              <Box minW={0} flex="1" fontSize="16px" fontWeight="600" noOfLines={1}>
                {displayBrand.name}
              </Box>
            </Flex>
          )}

          <Box
            as="main"
            minH={0}
            minW={0}
            flex="1 1 auto"
            overflow={contentOverflow}
            overflowX="hidden"
            pb={contentPaddingBottom}
          >
            {children}
          </Box>
        </Flex>
      </AppEntryErrorBoundary>
    </AppEntryBrandProvider>
  );
};

export default React.memo(AppEntryLayout);
