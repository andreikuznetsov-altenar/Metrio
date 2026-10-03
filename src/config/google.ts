/** Build-time Google OAuth client ID — product infrastructure, not a user setting. */
export function getGoogleOAuthClientId(): string {
  const fromEnv = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return '';
}

export function getBuildChannel(): string {
  return import.meta.env.VITE_BUILD_CHANNEL || 'development';
}

/** Developer OAuth override is only honored in local development builds. */
export function isGoogleDeveloperOverrideAllowed(buildChannel = getBuildChannel()): boolean {
  return buildChannel === 'development';
}

export type GoogleOAuthClientIdInput = {
  buildClientId?: string;
  developerOverride?: string;
  buildChannel?: string;
};

/**
 * Resolve the OAuth Client ID for the current session.
 * Build-time product Client ID is primary; developer override applies only when the build ID is empty
 * and the channel allows local development overrides.
 */
export function resolveGoogleOAuthClientId(input: GoogleOAuthClientIdInput = {}): string {
  const buildClientId = (input.buildClientId ?? getGoogleOAuthClientId()).trim();
  if (buildClientId) {
    return buildClientId;
  }

  if (!isGoogleDeveloperOverrideAllowed(input.buildChannel)) {
    return '';
  }

  return (input.developerOverride ?? '').trim();
}

export function resolveGoogleOAuthClientIdFromPrefs(
  google: { oauthClientId: string },
  buildChannel = getBuildChannel(),
): string {
  return resolveGoogleOAuthClientId({
    developerOverride: google.oauthClientId,
    buildChannel,
  });
}

export function isGoogleOAuthConfigured(
  googlePrefs?: Pick<{ oauthClientId: string }, 'oauthClientId'>,
): boolean {
  if (googlePrefs) {
    return !!resolveGoogleOAuthClientIdFromPrefs(googlePrefs);
  }
  return !!resolveGoogleOAuthClientId();
}

export function getGoogleOAuthDiagnosticState(): {
  oauthClientConfigured: boolean;
  buildChannel: string;
} {
  const buildChannel = getBuildChannel();
  return {
    oauthClientConfigured: isGoogleOAuthConfigured(),
    buildChannel,
  };
}

export function getGoogleConfigBannerMessage(): string | null {
  if (isGoogleOAuthConfigured()) return null;
  const channel = getBuildChannel();
  if (channel === 'development') {
    return 'Google integration is not configured in this development build.';
  }
  return 'Google integration is not configured in this build. Contact your administrator.';
}

/**
 * OAuth scopes requested by the desktop app (documented for internal beta):
 * - openid + email: identify the connected Google account
 * - forms.body: create and update Google Forms
 * - forms.responses.readonly: sync survey responses
 * - gmail.send: deliver survey and reminder emails
 * - drive.file: set responder access on Forms created by the app
 */
export const GOOGLE_OAUTH_SCOPES_DOC =
  'openid, email, forms.body, forms.responses.readonly, gmail.send, drive.file';

/** Granted only via explicit Calendar enable in Settings (Phase 39). */
export const GOOGLE_CALENDAR_READONLY_SCOPE_DOC = 'calendar.events.readonly';
