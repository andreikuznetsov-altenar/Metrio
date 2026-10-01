import { describe, expect, it } from 'vitest';
import {
  isGoogleDeveloperOverrideAllowed,
  isGoogleOAuthConfigured,
  resolveGoogleOAuthClientId,
  resolveGoogleOAuthClientIdFromPrefs,
} from './google';

describe('resolveGoogleOAuthClientId', () => {
  it('uses build-time Client ID when configured', () => {
    expect(
      resolveGoogleOAuthClientId({
        buildClientId: 'build-client.apps.googleusercontent.com',
        developerOverride: 'override-client.apps.googleusercontent.com',
        buildChannel: 'internal-beta',
      }),
    ).toBe('build-client.apps.googleusercontent.com');
  });

  it('allows developer override in development when build Client ID is empty', () => {
    expect(
      resolveGoogleOAuthClientId({
        buildClientId: '',
        developerOverride: 'dev-client.apps.googleusercontent.com',
        buildChannel: 'development',
      }),
    ).toBe('dev-client.apps.googleusercontent.com');
  });

  it('ignores developer override outside development channel', () => {
    expect(
      resolveGoogleOAuthClientId({
        buildClientId: '',
        developerOverride: 'dev-client.apps.googleusercontent.com',
        buildChannel: 'internal-beta',
      }),
    ).toBe('');
  });

  it('returns unconfigured when no Client ID is available', () => {
    expect(
      resolveGoogleOAuthClientId({
        buildClientId: '',
        developerOverride: '',
        buildChannel: 'development',
      }),
    ).toBe('');
    expect(
      resolveGoogleOAuthClientIdFromPrefs({ oauthClientId: '' }, 'development'),
    ).toBe('');
  });

  it('never replaces a non-empty production build Client ID with override', () => {
    const productionBuildId = 'prod-client.apps.googleusercontent.com';
    expect(
      resolveGoogleOAuthClientId({
        buildClientId: productionBuildId,
        developerOverride: 'saved-override.apps.googleusercontent.com',
        buildChannel: 'internal-beta',
      }),
    ).toBe(productionBuildId);
    expect(
      resolveGoogleOAuthClientId({
        buildClientId: productionBuildId,
        developerOverride: 'saved-override.apps.googleusercontent.com',
        buildChannel: 'development',
      }),
    ).toBe(productionBuildId);
    expect(
      resolveGoogleOAuthClientIdFromPrefs(
        { oauthClientId: 'saved-override.apps.googleusercontent.com' },
        'internal-beta',
      ),
    ).not.toBe('saved-override.apps.googleusercontent.com');
  });
});

describe('isGoogleDeveloperOverrideAllowed', () => {
  it('allows override only in development', () => {
    expect(isGoogleDeveloperOverrideAllowed('development')).toBe(true);
    expect(isGoogleDeveloperOverrideAllowed('internal-beta')).toBe(false);
    expect(isGoogleDeveloperOverrideAllowed('production')).toBe(false);
  });
});
