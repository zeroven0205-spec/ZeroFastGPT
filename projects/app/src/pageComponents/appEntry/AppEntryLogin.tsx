import React, { useState } from 'react';
import { Box, Button, Flex, FormControl, FormLabel, Input, Link, Text } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import type { LangEnum } from '@fastgpt/global/common/i18n/type';
import { useTranslation } from 'next-i18next';
import { getPreLogin, postLogin } from '@/web/support/user/api';
import { getAppEntryAuthSession } from '@/web/core/appEntry/auth';
import { getSafeAppEntryReturnPath } from '@/web/core/appEntry/route';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useAppEntryBrand } from './AppEntryBrandProvider';

type LoginFormData = {
  username: string;
  password: string;
};

type Props = {
  appKey: string;
  returnTo: string;
  authCodeError?: boolean;
};

/**
 * AppEntry 专用密码登录页。
 * 仅复用现有预登录和密码登录 API，不展示平台注册、OAuth 或管理端入口；登录后再次校验目标 App 权限再回跳。
 */
export const AppEntryLogin = ({ appKey, returnTo, authCodeError = false }: Props) => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { brand } = useAppEntryBrand();
  const { setUserInfo } = useUserStore();
  const [requesting, setRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    authCodeError ? '登录码无效或已过期，请返回 APP 重新进入。' : ''
  );
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>();

  const login = async ({ username, password }: LoginFormData) => {
    setRequesting(true);
    setErrorMessage('');

    try {
      const { code } = await getPreLogin(username);
      const loginResponse = await postLogin({
        username,
        password,
        code,
        language: i18n.language as LangEnum
      });
      await getAppEntryAuthSession(appKey);
      setUserInfo(loginResponse.user);
      await router.replace(getSafeAppEntryReturnPath({ appKey, returnTo }));
    } catch {
      setErrorMessage('登录失败，请检查账号密码及应用访问权限。');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Flex minH="100%" direction="column" justify="center" px="24px" py="40px">
      <Box w="100%" maxW="420px" mx="auto">
        <Text fontSize="24px" fontWeight="700">
          登录{brand.name}
        </Text>
        <Text mt="8px" color="gray.500" fontSize="14px">
          使用已有账号登录，暂不支持在此注册。
        </Text>

        <Box
          as="form"
          mt="32px"
          onSubmit={handleSubmit(login)}
          onKeyDown={(event: React.KeyboardEvent<HTMLFormElement>) => {
            if (event.key === 'Enter' && !event.shiftKey && !requesting) {
              void handleSubmit(login)();
            }
          }}
        >
          <FormControl isInvalid={!!errors.username}>
            <FormLabel fontSize="14px">账号</FormLabel>
            <Input
              size="lg"
              autoComplete="username"
              placeholder="请输入账号"
              {...register('username', { required: true })}
            />
          </FormControl>
          <FormControl mt="20px" isInvalid={!!errors.password}>
            <FormLabel fontSize="14px">密码</FormLabel>
            <Input
              size="lg"
              type="password"
              autoComplete="current-password"
              placeholder="请输入密码"
              {...register('password', { required: true, maxLength: 60 })}
            />
          </FormControl>

          {errorMessage && (
            <Text mt="16px" color="red.500" fontSize="13px" role="alert">
              {errorMessage}
            </Text>
          )}

          <Button
            type="submit"
            mt="24px"
            w="100%"
            size="lg"
            color="white"
            bg={brand.primaryColor || '#3370FF'}
            _hover={{ bg: brand.primaryColor || '#3370FF' }}
            isLoading={requesting}
          >
            登录
          </Button>
        </Box>

        {(brand.privacyUrl || brand.termsUrl) && (
          <Flex mt="20px" justify="center" gap="16px" fontSize="12px" color="gray.500">
            {brand.privacyUrl && (
              <Link href={brand.privacyUrl} isExternal>
                隐私政策
              </Link>
            )}
            {brand.termsUrl && (
              <Link href={brand.termsUrl} isExternal>
                用户协议
              </Link>
            )}
          </Flex>
        )}
      </Box>
    </Flex>
  );
};
