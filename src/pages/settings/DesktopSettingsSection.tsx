import { useEffect } from "react";
import { Switch } from "../../components/Switch/Switch";
import { useToast } from "../../components/Toast/ToastContext";
import type { AppPreferences } from "../../platform/preferences";
import {
  reconcileLaunchAtLoginPreference,
  setKeepRunningInTrayPreference,
  setLaunchAtLoginPreference,
  type PersistPreferences,
} from "./generalDesktopPreferences";

export function DesktopSettingsSection({
  prefs,
  onPersist,
}: {
  prefs: AppPreferences;
  onPersist: PersistPreferences;
}) {
  const { error: toastError } = useToast();

  useEffect(() => {
    void reconcileLaunchAtLoginPreference(prefs, onPersist);
  }, [prefs, onPersist]);

  return (
    <div className="settings-card__body" data-testid="desktop-settings">
      <p className="settings-card__description">
        Menu bar and startup behavior for the desktop app.
      </p>
      <div className="settings-toggle-stack">
        <div className="settings-toggle-row">
          <span className="settings-toggle-row__label">Menu bar mode</span>
          <Switch
            aria-label="Menu bar mode"
            checked={prefs.general.keepRunningInTray}
            onCheckedChange={(checked) => {
              void setKeepRunningInTrayPreference(
                prefs,
                checked,
                onPersist,
                toastError,
              );
            }}
          />
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-row__label">Launch at login</span>
          <Switch
            aria-label="Launch at login"
            checked={prefs.general.launchAtLogin}
            onCheckedChange={(checked) => {
              void setLaunchAtLoginPreference(
                prefs,
                checked,
                onPersist,
                toastError,
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
