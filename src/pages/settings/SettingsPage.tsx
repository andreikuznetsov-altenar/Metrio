import { useCallback, useEffect, useState } from "react";
import { COMPANY_CONFIG } from "../../config/company";
import { readSavedConnection, type SavedConnection } from "../../app/connectionStorage";
import { setFeedbackPrefsSnapshot } from "../../app/feedbackPrefsBridge";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import { formatPreferenceSyncTimestamp } from "../../platform/formatPreferenceSync";
import { syncGeneralPreferencesToNative } from "../../platform/generalPreferencesSync";
import {
  testBambooConnectionSaved,
  testJiraConnectionSaved,
} from "../../platform/connectionTest";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from "../../platform/preferences";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemePreference } from "../../theme/theme";
import { PageSubnav } from "../../shell/PageSubnav";
import type { SettingsSection } from "./types";
import { GoogleConnectionPanel } from "../feedback/GoogleConnectionPanel";
import "../page-content.css";
import "./settings.css";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "connections", label: "Connections" },
  { id: "notifications", label: "Notifications" },
  { id: "advanced", label: "Advanced" },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export interface SettingsPageProps {
  onReconnect?: () => void;
  initialSection?: SettingsSection;
}

export function SettingsPage({
  onReconnect,
  initialSection = "general",
}: SettingsPageProps) {
  const { preference, setPreference } = useTheme();
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [connection, setConnection] = useState<SavedConnection | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [jiraTest, setJiraTest] = useState<string | null>(null);
  const [bambooTest, setBambooTest] = useState<string | null>(null);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
  const { connectGoogle, disconnectGoogle, loading: googleBusy } = useFeedbackSurveyStore();

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    let cancelled = false;
    loadPreferences().then((loaded) => {
      if (!cancelled) {
        setPrefs(loaded);
        setFeedbackPrefsSnapshot(loaded);
      }
    });
    readSavedConnection().then((saved) => {
      if (!cancelled) setConnection(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistPrefs = useCallback(async (next: AppPreferences) => {
    setPrefs(next);
    setFeedbackPrefsSnapshot(next);
    try {
      await savePreferences(next);
      await syncGeneralPreferencesToNative(next.general);
      setStatusMessage("Settings saved.");
    } catch {
      setStatusMessage("Could not save settings to disk.");
    }
  }, []);

  const handleGoogleConnect = useCallback(
    async (input: { webAppUrl: string; bridgeSecret: string }) => {
      setGoogleMessage(null);
      const status = await connectGoogle(input);
      const patch: Partial<AppPreferences["google"]> = { ...status };
      if (input.webAppUrl.trim()) {
        patch.appsScriptWebAppUrl = input.webAppUrl.trim();
        patch.responseAccess = "anyone_with_link";
        patch.emailCollectionMode = "RESPONDER_INPUT";
      }
      await persistPrefs({
        ...prefs,
        google: { ...prefs.google, ...patch },
      });
      setGoogleMessage(`Connected as ${status.accountEmail}`);
    },
    [connectGoogle, persistPrefs, prefs],
  );

  const handleGoogleDisconnect = useCallback(async () => {
    await disconnectGoogle();
    await persistPrefs({
      ...prefs,
      google: {
        ...prefs.google,
        appsScriptWebAppUrl: "",
        accountEmail: "",
        formsConnected: false,
        gmailConnected: false,
      },
    });
    setGoogleMessage("Disconnected");
  }, [disconnectGoogle, persistPrefs, prefs]);

  const patchGooglePrefs = useCallback(
    async (patch: Partial<AppPreferences["google"]>) => {
      await persistPrefs({ ...prefs, google: { ...prefs.google, ...patch } });
    },
    [persistPrefs, prefs],
  );

  const onExportDiagnostics = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const payload = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          connections: {
            workEmail: connection?.workEmail ?? prefs.workEmail,
            jiraBaseUrl: COMPANY_CONFIG.jiraBaseUrl,
            bambooSubdomain: COMPANY_CONFIG.bambooSubdomain,
            hasJiraToken: connection?.hasJiraToken ?? false,
            hasBambooApiKey: connection?.hasBambooApiKey ?? false,
          },
          sync: prefs.sync,
        },
        null,
        2,
      );
      const path = await invoke<string>("diagnostics_export_file", {
        content: payload,
      });
      setStatusMessage(`Diagnostics exported to ${path}`);
    } catch {
      setStatusMessage("Diagnostics export is unavailable in this environment.");
    } finally {
      setBusy(false);
    }
  };

  const onOpenLogs = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("logs_open_folder");
      setStatusMessage("Opened logs folder.");
    } catch {
      setStatusMessage("Log folder is unavailable in this environment.");
    } finally {
      setBusy(false);
    }
  };

  const onResetData = async () => {
    if (!window.confirm("Reset app preferences and connection metadata on this device?")) {
      return;
    }
    setBusy(true);
    try {
      const { clearConnection } = await import("../../app/connectionStorage");
      await clearConnection();
      await savePreferences({ ...DEFAULT_PREFERENCES });
      setPrefs({ ...DEFAULT_PREFERENCES });
      setConnection(null);
      setStatusMessage("Local app data reset. Reconnect to continue.");
      onReconnect?.();
    } catch {
      setStatusMessage("Reset failed.");
    } finally {
      setBusy(false);
    }
  };

  const onTestJira = async () => {
    setBusy(true);
    setJiraTest(null);
    const result = await testJiraConnectionSaved();
    setJiraTest(`${result.label}: ${result.detail}`);
    setBusy(false);
  };

  const onTestBamboo = async () => {
    setBusy(true);
    setBambooTest(null);
    const result = await testBambooConnectionSaved();
    setBambooTest(`${result.label}: ${result.detail}`);
    setBusy(false);
  };

  return (
    <div className="page-content settings-layout">
      <PageSubnav
        items={SECTIONS}
        activeId={section}
        onChange={setSection}
        ariaLabel="Settings sections"
      />

      {statusMessage ? (
        <p className="settings-status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {section === "general" ? (
        <div className="settings-panel">
          <Card title="General" description="Appearance and startup behavior.">
            <div className="settings-row">
              <span className="settings-row__label">Theme</span>
              <Select
                aria-label="Theme"
                value={preference}
                options={THEME_OPTIONS}
                onChange={(event) =>
                  setPreference(event.target.value as ThemePreference)
                }
              />
            </div>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={prefs.general.launchAtLogin}
                onChange={(event) => {
                  void persistPrefs({
                    ...prefs,
                    general: {
                      ...prefs.general,
                      launchAtLogin: event.target.checked,
                    },
                  });
                }}
              />
              Launch Metrio at login
            </label>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={prefs.general.keepRunningInTray}
                onChange={(event) => {
                  void persistPrefs({
                    ...prefs,
                    general: {
                      ...prefs.general,
                      keepRunningInTray: event.target.checked,
                    },
                  });
                }}
              />
              Keep running in the menu bar when the window is closed
            </label>
          </Card>
        </div>
      ) : null}

      {section === "connections" ? (
        <div className="settings-panel">
          <Card
            title="Connections"
            description="Jira and Bamboo credentials are stored in the system keychain."
          >
            <div className="settings-row">
              <span className="settings-row__label">Work email</span>
              <Input
                readOnly
                value={connection?.workEmail || prefs.workEmail || "—"}
              />
            </div>
            <div className="settings-row">
              <span className="settings-row__label">Jira</span>
              <Input readOnly value={COMPANY_CONFIG.jiraBaseUrl} />
            </div>
            <div className="settings-row">
              <span className="settings-row__label">BambooHR</span>
              <Input readOnly value={COMPANY_CONFIG.bambooPortalUrl} />
            </div>
            <p className="settings-row__hint">
              Jira token:{" "}
              {connection?.hasJiraToken ? "Saved securely" : "Not configured"}
              {" · "}
              Bamboo key:{" "}
              {connection?.hasBambooApiKey ? "Saved securely" : "Not configured"}
            </p>
            {onReconnect ? (
              <div className="settings-actions">
                <Button type="button" variant="secondary" onClick={onReconnect}>
                  Reconnect integrations
                </Button>
              </div>
            ) : null}
          </Card>

          <GoogleConnectionPanel
            prefs={prefs}
            loading={googleBusy}
            message={googleMessage}
            mode="settings"
            showAdvanced
            onConnect={handleGoogleConnect}
            onReconnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
            onUpdatePrefs={patchGooglePrefs}
          />
        </div>
      ) : null}

      {section === "notifications" ? (
        <div className="settings-panel">
          <Card title="Notifications" description="Choose which alerts Metrio may show.">
            {(
              [
                ["vacationStarts", "Vacation starting soon"],
                ["vacationReminder", "Vacation reminders"],
                ["returns", "Return from time off"],
                ["workloadAlerts", "Workload changes"],
                ["problematicTaskAlerts", "Problematic tasks"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="settings-toggle">
                <input
                  type="checkbox"
                  checked={prefs.notifications[key]}
                  onChange={(event) => {
                    void persistPrefs({
                      ...prefs,
                      notifications: {
                        ...prefs.notifications,
                        [key]: event.target.checked,
                      },
                    });
                  }}
                />
                {label}
              </label>
            ))}
          </Card>
        </div>
      ) : null}

      {section === "advanced" ? (
        <div className="settings-panel">
          <Card
            title="Advanced"
            description="Diagnostics and maintenance tools. Not shown in other settings sections."
          >
            <p className="settings-advanced-note">
              Use these tools only when troubleshooting sync or connection issues.
            </p>
            <div className="settings-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void onExportDiagnostics()}
              >
                Export diagnostics
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void onOpenLogs()}
              >
                Open logs folder
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy}
                onClick={() => void onResetData()}
              >
                Reset local data
              </Button>
            </div>
          </Card>

          <Card title="Connection debugging" description="Quick integration checks.">
            <p className="settings-row__hint">
              Last Jira sync: {formatPreferenceSyncTimestamp(prefs.sync.lastJiraSync)}
              {" · "}
              Last Bamboo sync:{" "}
              {formatPreferenceSyncTimestamp(prefs.sync.lastBambooSync)}
            </p>
            <p
              className={
                prefs.sync.jiraStale || prefs.sync.bambooStale
                  ? "settings-status settings-status--warn"
                  : "settings-status settings-status--ok"
              }
            >
              {prefs.sync.jiraStale || prefs.sync.bambooStale
                ? "One or more integrations may be stale."
                : "Integration timestamps look current."}
            </p>
            <div className="settings-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void onTestJira()}
              >
                Test Jira connection
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void onTestBamboo()}
              >
                Test Bamboo connection
              </Button>
            </div>
            {jiraTest ? <p className="settings-row__hint">{jiraTest}</p> : null}
            {bambooTest ? <p className="settings-row__hint">{bambooTest}</p> : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
