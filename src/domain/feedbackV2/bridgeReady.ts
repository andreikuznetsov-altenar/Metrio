import type { AppPreferences } from '../../platform/preferences';

/** Apps Script bridge is the only supported Feedback Google integration (PASS 16). */
export function isFeedbackBridgeReady(prefs: AppPreferences): boolean {
  return (
    !!prefs.google.appsScriptWebAppUrl.trim() &&
    prefs.google.formsConnected &&
    prefs.google.gmailConnected
  );
}

export function isFeedbackBridgeConfigured(prefs: AppPreferences): boolean {
  return !!prefs.google.appsScriptWebAppUrl.trim();
}
