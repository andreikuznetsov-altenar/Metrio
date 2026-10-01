import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openUrl } = vi.hoisted(() => ({
  openUrl: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl,
}));

import { openExternalUrl } from '../platform/openExternal';
import { ATLASSIAN_API_TOKEN_URL, getBambooApiKeyHelpUrl } from './links';

describe('help link destinations', () => {
  beforeEach(() => {
    openUrl.mockReset();
  });

  it('uses official Atlassian API token URL', () => {
    expect(ATLASSIAN_API_TOKEN_URL).toContain('atlassian.com');
  });

  it('opens external URLs through Tauri opener', async () => {
    await openExternalUrl(ATLASSIAN_API_TOKEN_URL);
    expect(openUrl).toHaveBeenCalledWith(ATLASSIAN_API_TOKEN_URL);
  });

  it('opens the BambooHR API keys settings page for Altenar', () => {
    expect(getBambooApiKeyHelpUrl()).toBe(
      'https://altenar.bamboohr.com/app/settings/permissions/api_keys',
    );
  });

  it('opens external URLs through Tauri opener for bamboo help', async () => {
    await openExternalUrl(getBambooApiKeyHelpUrl());
    expect(openUrl).toHaveBeenCalledWith(
      'https://altenar.bamboohr.com/app/settings/permissions/api_keys',
    );
  });
});
