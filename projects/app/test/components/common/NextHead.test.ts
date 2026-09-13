import React, { type ReactNode } from 'react';
import ReactDOMServer from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import NextHead from '@/components/common/NextHead';

vi.mock('next/head', () => ({
  default: ({ children }: { children: ReactNode }) => children
}));

const renderHead = (icon: string, appEntry = false) => {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(NextHead, { title: 'Dashboard', icon, appEntry })
  );
};

describe('NextHead', () => {
  it('restores dashboard favicon after leaving editor', () => {
    expect(renderHead('/editor-avatar.png')).toContain('href="/editor-avatar.png"');
    expect(renderHead('/')).toContain('href="/favicon.ico"');
  });

  it('uses only the supplied AppEntry icon and adds an apple touch icon', () => {
    const businessIcon = 'data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E';
    const html = renderHead(businessIcon, true);

    expect(html).toContain(`rel="icon" href="${businessIcon}"`);
    expect(html).toContain(`rel="apple-touch-icon" href="${businessIcon}"`);
    expect(renderHead('/', true)).not.toContain('/favicon.ico');
  });
});
