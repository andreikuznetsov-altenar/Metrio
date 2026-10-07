import type { AppPreferences } from "../../platform/preferences";
import { AboutSettingsPanel } from "./AboutSettingsPanel";
import { CompanySettingsPanel } from "./CompanySettingsPanel";
import { DesktopSettingsSection } from "./DesktopSettingsSection";
import { OrganizationIdentitySettingsPanel } from "./OrganizationIdentitySettingsPanel";
import { SettingsCacheClearPanel } from "./SettingsCacheClearPanel";
import type { PersistPreferences } from "./generalDesktopPreferences";

export interface CompanyAppSettingsPanelProps {
  prefs: AppPreferences;
  onPersist: PersistPreferences;
}

export function CompanyAppSettingsPanel({
  prefs,
  onPersist,
}: CompanyAppSettingsPanelProps) {
  return (
    <div className="settings-panel" data-testid="company-app-settings">
      <p className="settings-intro">
        Company configuration, desktop behavior, and organization context.
      </p>

      <section className="settings-card">
        <h3 className="settings-card__title">Company</h3>
        <CompanySettingsPanel embedded />
      </section>

      <section className="settings-card">
        <h3 className="settings-card__title">About</h3>
        <AboutSettingsPanel embedded />
      </section>

      <section className="settings-card">
        <h3 className="settings-card__title">Desktop</h3>
        <DesktopSettingsSection prefs={prefs} onPersist={onPersist} />
      </section>

      <section className="settings-card">
        <h3 className="settings-card__title">Organization</h3>
        <OrganizationIdentitySettingsPanel prefs={prefs} />
      </section>

      <section className="settings-card">
        <h3 className="settings-card__title">Caches</h3>
        <SettingsCacheClearPanel />
      </section>
    </div>
  );
}
