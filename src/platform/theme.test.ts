/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { applyResolvedTheme, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('resolves light and dark preferences', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('applyResolvedTheme', () => {
  it('sets data-theme on document root', () => {
    applyResolvedTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyResolvedTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
