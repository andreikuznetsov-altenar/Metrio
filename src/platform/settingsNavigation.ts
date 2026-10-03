import type { SettingsSection } from "../pages/settings/types";

export const SETTINGS_OPEN_EVENT = "metrio-open-settings";

export function openSettingsSection(section: SettingsSection = "preferences"): void {
  window.dispatchEvent(
    new CustomEvent(SETTINGS_OPEN_EVENT, { detail: { section } }),
  );
}
