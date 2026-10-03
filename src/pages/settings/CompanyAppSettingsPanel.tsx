import type { AppPreferences } from "../../platform/preferences";
import { AboutSettingsPanel } from "./AboutSettingsPanel";
import { CompanySettingsPanel } from "./CompanySettingsPanel";
import { DiagnosticsSettingsPanel } from "./DiagnosticsSettingsPanel";

export interface CompanyAppSettingsPanelProps {
  prefs: AppPreferences;
  onPersist: (next: AppPreferences) => Promise<void>;
}

export function CompanyAppSettingsPanel({
  prefs,
  onPersist,
}: CompanyAppSettingsPanelProps) {
  return (
    <div className="settings-panel" data-testid="company-app-settings">
      <p className="settings-intro">
        Company configuration, app information, and technical diagnostics.
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
        <h3 className="settings-card__title">Diagnostics</h3>
        <DiagnosticsSettingsPanel prefs={prefs} onPersist={onPersist} embedded />
      </section>
    </div>
  );
}
