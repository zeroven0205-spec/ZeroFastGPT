import React from 'react';
import { Button, Flex, Text } from '@chakra-ui/react';
import type { AppEntryBrandConfig } from '@/web/core/appEntry/type';
import { AppEntryBrandMark } from './AppEntryBrandMark';

/** AppEntry 统一安全错误态；不展示异常对象、内部模块名或运维排查入口。 */
export const AppEntryErrorState = ({
  brand,
  title = '服务暂不可用',
  description = '请稍后重试。如问题持续，请返回 APP 后重新进入。',
  actionLabel = '重新加载',
  onAction
}: {
  brand: AppEntryBrandConfig;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <Flex minH="100%" direction="column" align="center" justify="center" px="24px" py="48px">
    <AppEntryBrandMark brand={brand} size="48px" />
    <Text mt="20px" fontSize="20px" fontWeight="700" textAlign="center">
      {title}
    </Text>
    <Text mt="8px" maxW="360px" color="gray.500" fontSize="14px" textAlign="center">
      {description}
    </Text>
    {onAction && (
      <Button
        mt="24px"
        color="white"
        bg={brand.primaryColor}
        _hover={{ bg: brand.primaryColor }}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    )}
  </Flex>
);
