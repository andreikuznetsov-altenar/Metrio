import type { AppPreferences } from "../preferences";

const SECRET_PATTERNS = [
  /api[_-]?token/gi,
  /refresh_token/gi,
  /access_token/gi,
  /Bearer\s+\S+/gi,
  /x-api-key/gi,
  /password/gi,
  /client_secret/gi,
];

export function hashIdentifier(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export function redactEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return "";
  return `email_${hashIdentifier(trimmed.toLowerCase())}`;
}

export function redactPath(path: string): string {
  return path
    .replace(/\/Users\/[^/]+/g, "/Users/[user]")
    .replace(/\\Users\\[^\\]+/g, "\\Users\\[user]")
    .replace(/\/home\/[^/]+/g, "/home/[user]");
}

export function scrubSecretsFromText(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  out = out.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    (m) => redactEmail(m),
  );
  return redactPath(out);
}

export function buildPreferencesSafeSnapshot(
  prefs: AppPreferences,
): Record<string, unknown> {
  return {
    schemaVersion: prefs.schemaVersion,
    setup: prefs.setup,
    jiraBaseUrl: prefs.jiraBaseUrl ? "[configured]" : "",
    jiraEmail: prefs.jiraEmail ? redactEmail(prefs.jiraEmail) : "",
    bambooSubdomain: prefs.bambooSubdomain ? "[configured]" : "",
    workEmail: prefs.workEmail ? redactEmail(prefs.workEmail) : "",
    sync: prefs.sync,
    credentials: prefs.credentials,
    google: {
      accountEmail: prefs.google.accountEmail
        ? redactEmail(prefs.google.accountEmail)
        : "",
      formsConnected: prefs.google.formsConnected,
      gmailConnected: prefs.google.gmailConnected,
      calendarConnected: prefs.google.calendarConnected,
      emailCollectionMode: prefs.google.emailCollectionMode,
      responseAccess: prefs.google.responseAccess,
      appsScriptWebAppUrl: prefs.google.appsScriptWebAppUrl ? "[set]" : "",
      oauthClientId: prefs.google.oauthClientId ? "[override]" : "",
    },
    general: prefs.general,
    appearance: {
      theme: prefs.appearance.theme,
      displayTimezone: prefs.appearance.displayTimezone,
      hideFractionalTimezones: prefs.appearance.hideFractionalTimezones,
    },
    diagnostics: prefs.diagnostics,
  };
}

export function assertNoSecretsInBundle(
  contents: string[],
  forbiddenValues: string[],
): void {
  const blob = contents.join("\n");
  for (const secret of forbiddenValues) {
    if (secret && blob.includes(secret)) {
      throw new Error(`Support bundle leaked forbidden value`);
    }
  }
}
