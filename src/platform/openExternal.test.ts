import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openUrl } = vi.hoisted(() => ({
  openUrl: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl,
}));

import { openExternalUrl } from './openExternal';

describe('openExternalUrl', () => {
  beforeEach(() => {
    openUrl.mockReset();
  });

  it('delegates to the Tauri opener plugin', async () => {
    await openExternalUrl('https://example.com/browse/ABC-1');
    expect(openUrl).toHaveBeenCalledWith('https://example.com/browse/ABC-1');
  });

  it('ignores empty urls', async () => {
    await openExternalUrl('   ');
    expect(openUrl).not.toHaveBeenCalled();
  });
});
