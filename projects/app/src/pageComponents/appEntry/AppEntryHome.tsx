import React from 'react';
import AppEntryWorkbench from './AppEntryWorkbench';

type HomeProps = {
  appKey: string;
  appId: string;
};

/** AppEntry 登录后的业务工作台；现有独立 Chat 页面继续由 /chat 路由承载。 */
export const AppEntryHome = ({ appKey, appId }: HomeProps) => (
  <AppEntryWorkbench appKey={appKey} appId={appId} />
);

export const AppEntryPlaceholder = ({
  title,
  description
}: {
  title: string;
  description: string;
}) => (
  <div
    style={{
      minHeight: '100%',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      textAlign: 'center'
    }}
  >
    <div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
      <div style={{ marginTop: 8, color: '#718096', fontSize: 14 }}>{description}</div>
    </div>
  </div>
);
