import React from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { getAppEntryPath } from '@/web/core/appEntry/route';
import { useAppEntryBrand } from './AppEntryBrandProvider';

type HomeProps = {
  appKey: string;
};

export const AppEntryHome = ({ appKey }: HomeProps) => {
  const router = useRouter();
  const { brand } = useAppEntryBrand();

  return (
    <Flex
      minH="100%"
      direction="column"
      align="center"
      justify="center"
      gap="24px"
      px="24px"
      py="48px"
    >
      <Box textAlign="center">
        <Text fontSize="24px" fontWeight="700">
          {brand.name}
        </Text>
        {brand.description && (
          <Text mt="8px" color="gray.500" fontSize="14px">
            {brand.description}
          </Text>
        )}
      </Box>
      <Button
        color="white"
        bg={brand.primaryColor || '#3370FF'}
        _hover={{ bg: brand.primaryColor || '#3370FF' }}
        onClick={() => router.push(getAppEntryPath(appKey, 'chat'))}
      >
        开始使用
      </Button>
    </Flex>
  );
};

export const AppEntryPlaceholder = ({
  title,
  description
}: {
  title: string;
  description: string;
}) => (
  <Flex minH="100%" direction="column" align="center" justify="center" gap="8px" px="24px">
    <Text fontSize="20px" fontWeight="600">
      {title}
    </Text>
    <Text color="gray.500" fontSize="14px" textAlign="center">
      {description}
    </Text>
  </Flex>
);
