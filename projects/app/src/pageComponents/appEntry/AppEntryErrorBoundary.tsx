import React from 'react';
import type { AppEntryBrandConfig } from '@/web/core/appEntry/type';
import { AppEntryErrorState } from './AppEntryErrorState';

type Props = {
  brand: AppEntryBrandConfig;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

/** 捕获 AppEntry 客户端渲染异常，并替换为不包含内部细节的统一错误页。 */
export class AppEntryErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppEntryErrorState brand={this.props.brand} onAction={() => window.location.reload()} />
      );
    }

    return this.props.children;
  }
}
