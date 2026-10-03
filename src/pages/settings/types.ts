export type SettingsSection =
  | "preferences"
  | "connections"
  | "operational-rules"
  | "company-app";

/** @deprecated Legacy ids — use normalizeSettingsSection() */
export type LegacySettingsSection =
  | "general"
  | "notifications"
  | "digests"
  | "company"
  | "diagnostics"
  | "about";
