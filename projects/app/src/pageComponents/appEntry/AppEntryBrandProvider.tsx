import React, { createContext, useContext } from 'react';
import type { AppEntryBrandConfig } from '@/web/core/appEntry/type';

type AppEntryBrandContextValue = {
  brand: AppEntryBrandConfig;
};

const AppEntryBrandContext = createContext<AppEntryBrandContextValue | null>(null);

export const AppEntryBrandProvider = ({
  brand,
  children
}: {
  brand: AppEntryBrandConfig;
  children: React.ReactNode;
}) => <AppEntryBrandContext.Provider value={{ brand }}>{children}</AppEntryBrandContext.Provider>;

/** 读取当前 AppEntry 页面品牌配置；脱离 Provider 使用时直接抛错，避免误用全局品牌。 */
export const useAppEntryBrand = () => {
  const context = useContext(AppEntryBrandContext);
  if (!context) {
    throw new Error('useAppEntryBrand must be used within AppEntryBrandProvider');
  }
  return context;
};
