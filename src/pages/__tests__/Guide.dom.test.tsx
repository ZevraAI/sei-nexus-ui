// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import Guide from '../Guide.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

afterEach(cleanup);
const wrap = (user: unknown) => render(<ThemeProvider><Guide user={user} /></ThemeProvider>);

describe('Guide (How Zevra works)', () => {
  it('is refused for a customer\'s tenant admin', () => {
    wrap({ role: 'ADMIN', tenant_schema: 'tenant_acme_retail' });
    expect(screen.getByTestId('guide-denied')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('is refused for a non-admin', () => {
    wrap({ role: 'ANALYST', tenant_schema: 'public' });
    expect(screen.getByTestId('guide-denied')).toBeTruthy();
  });

  it('shows the built guide to a Zevra platform admin, following the app theme', async () => {
    wrap({ role: 'ADMIN', tenant_schema: 'public' });
    await waitFor(() => expect(document.querySelector('iframe')).not.toBeNull());
    const doc = document.querySelector('iframe')!.getAttribute('srcdoc') || '';
    expect(doc).toContain('How Zevra Works');
    expect(doc).toMatch(/<html lang="en" data-theme="(light|dark)">/);
  });
});
