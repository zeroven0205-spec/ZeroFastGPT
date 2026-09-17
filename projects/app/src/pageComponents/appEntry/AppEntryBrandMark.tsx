import React from 'react';
import { Image } from '@chakra-ui/react';
import type { AppEntryBrandConfig } from '@/web/core/appEntry/type';
import { getAppEntryDisplayBrand } from '@/web/core/appEntry/brand';

/** 渲染仅使用业务配置或业务派生图标的 AppEntry 品牌标记。 */
export const AppEntryBrandMark = ({
  brand,
  size = '32px'
}: {
  brand: AppEntryBrandConfig;
  size?: string;
}) => {
  const displayBrand = getAppEntryDisplayBrand(brand);

  return (
    <Image
      src={displayBrand.logo}
      alt={displayBrand.name}
      boxSize={size}
      flexShrink={0}
      objectFit="contain"
      borderRadius="8px"
    />
  );
};
