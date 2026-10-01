import type { AppPreferences } from "../platform/preferences";
import { DEFAULT_PREFERENCES } from "../platform/preferences";

let prefsSnapshot: AppPreferences = DEFAULT_PREFERENCES;

export function setFeedbackPrefsSnapshot(prefs: AppPreferences): void {
  prefsSnapshot = prefs;
}

export function getFeedbackPrefsSnapshot(): AppPreferences {
  return prefsSnapshot;
}
