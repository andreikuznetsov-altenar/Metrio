import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { openUrl } = vi.hoisted(() => ({
  openUrl: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl,
}));

import { openExternalUrl, parseExternalUrl } from './openExternal';

describe('openExternalUrl', () => {
  beforeEach(() => {
    openUrl.mockReset();
    openUrl.mockResolvedValue(undefined);
  });
  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    vi.restoreAllMocks();
  });

  it('delegates to the Tauri opener plugin', async () => {
    await openExternalUrl('https://example.com/browse/ABC-1');
    expect(openUrl).toHaveBeenCalledWith('https://example.com/browse/ABC-1');
  });

  it('ignores empty urls', async () => {
    await openExternalUrl('   ');
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('only http(s) and mailto may leave Metrio', async () => {
    for (const bad of ['file:///etc/passwd', 'javascript:alert(1)', 'ssh://host', 'not a url', 'tauri://localhost/x']) {
      await openExternalUrl(bad);
    }
    expect(openUrl).not.toHaveBeenCalled();
    expect(parseExternalUrl('mailto:a@b.com')?.protocol).toBe('mailto:');
    await openExternalUrl('mailto:manager@co.com');
    expect(openUrl).toHaveBeenCalledWith('mailto:manager@co.com');
  });

  it('packaged Tauri runtime: uses the opener and never falls back to window.open', async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
    await openExternalUrl('https://altenar.atlassian.net/browse/UX-1502');
    expect(openUrl).toHaveBeenCalledWith('https://altenar.atlassian.net/browse/UX-1502');
    expect(windowOpen).not.toHaveBeenCalled();

    openUrl.mockRejectedValueOnce(new Error('opener failed'));
    await expect(openExternalUrl('https://example.com/')).rejects.toThrow('opener failed');
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it('browser/dev fallback: opens a new window with noopener,noreferrer when the opener is unavailable', async () => {
    openUrl.mockRejectedValueOnce(new Error('no tauri'));
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
    await openExternalUrl('https://example.com/a');
    expect(windowOpen).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer');
  });
});
