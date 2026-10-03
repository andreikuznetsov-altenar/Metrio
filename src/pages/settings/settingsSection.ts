import type { SettingsSection } from "./types";

/** Deep links and legacy section ids map into the consolidated IA. */
export function normalizeSettingsSection(
  section: string | SettingsSection,
): SettingsSection {
  if (
    section === "general" ||
    section === "notifications" ||
    section === "digests"
  ) {
    return "preferences";
  }
  if (section === "company" || section === "about" || section === "diagnostics") {
    return "company-app";
  }
  if (
    section === "preferences" ||
    section === "connections" ||
    section === "operational-rules" ||
    section === "company-app"
  ) {
    return section;
  }
  return "preferences";
}
