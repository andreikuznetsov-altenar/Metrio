import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { readSavedConnection, type SavedConnection } from "../../app/connectionStorage";
import { setFeedbackPrefsSnapshot } from "../../app/feedbackPrefsBridge";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { Button } from "../../components/Button/Button";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { Switch } from "../../components/Switch/Switch";
import { Input } from "../../components/Input/Input";
import { useToast } from "../../components/Toast/ToastContext";
import { syncGeneralPreferencesToNative } from "../../platform/generalPreferencesSync";
import {
  testBambooConnectionSaved,
  testJiraConnectionSaved,
} from "../../platform/connectionTest";
import {
  updateBambooApiKey,
  updateJiraToken,
} from "../../platform/integrationCredentials";
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
import { SettingsCredentialField } from "./SettingsCredentialField";
import "../page-content.css";
import { OperationalRulesSettingsPanel } from "./OperationalRulesSettingsPanel";
import { DigestSettingsPanel } from "./DigestSettingsPanel";
import { AboutSettingsPanel } from "./AboutSettingsPanel";
import { CompanySettingsPanel } from "./CompanySettingsPanel";
import "./settings.css";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "connections", label: "Connections" },
  { id: "notifications", label: "Notifications" },
  { id: "operational-rules", label: "Attention rules" },
  { id: "digests", label: "Briefs" },
  { id: "company", label: "Company" },
  { id: "about", label: "About" },
];

const THEME_OPTIONS: {
  value: ThemePreference;
  label: ReactNode;
}[] = [
  {
    value: "light",
    label: (
      <>
        <Sun size={14} strokeWidth={1.75} aria-hidden /> Light
      </>
    ),
  },
  {
    value: "dark",
    label: (
      <>
        <Moon size={14} strokeWidth={1.75} aria-hidden /> Dark
      </>
    ),
  },
  {
    value: "system",
    label: (
      <>
        <Laptop size={14} strokeWidth={1.75} aria-hidden /> System
      </>
    ),
  },
];

const NOTIFICATION_ROWS: {
  key: keyof AppPreferences["notifications"];
  label: string;
  description: string;
}[] = [
  {
    key: "jiraAssignmentAlerts",
    label: "New Jira assignments",
    description: "When a Jira issue is newly assigned to you.",
  },
  {
    key: "problematicTaskAlerts",
    label: "Task attention",
    description: "When a task needs attention or becomes problematic.",
  },
  {
    key: "bambooActionAlerts",
    label: "Bamboo actions",
    description: "When BambooHR requires a document or onboarding step.",
  },
  {
    key: "vacationReminder",
    label: "Vacation reminders",
    description: "Reminders at 7, 3, and 1 day before leave (and on the day).",
  },
  {
    key: "vacationStarts",
    label: "Vacation starting soon",
    description: "When a team member's leave is about to start.",
  },
  {
    key: "returns",
    label: "Return from time off",
    description: "When someone returns to the team.",
  },
  {
    key: "workloadAlerts",
    label: "Workload alerts",
    description: "When workload becomes heavy or overloaded.",
  },
  {
    key: "feedbackActionAlerts",
    label: "Feedback actions",
    description: "Delivery failures and surveys that need your action.",
  },
  {
    key: "integrationProblemAlerts",
    label: "Integration problems",
    description: "When Jira or BambooHR data cannot be refreshed.",
  },
];

export interface SettingsPageProps {
  onReconnect?: () => void;
  initialSection?: SettingsSection;
}

export function SettingsPage({
  initialSection = "general",
}: SettingsPageProps) {
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [connection, setConnection] = useState<SavedConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const { connectGoogle, disconnectGoogle, loading: googleBusy } = useFeedbackSurveyStore();

  const refreshConnection = useCallback(async () => {
    setConnection(await readSavedConnection());
  }, []);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    let cancelled = false;
    void loadPreferences().then((loaded) => {
      if (!cancelled) {
        setPrefs(loaded);
        setFeedbackPrefsSnapshot(loaded);
      }
    });
    void readSavedConnection().then((saved) => {
      if (!cancelled) setConnection(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistPrefs = useCallback(
    async (next: AppPreferences, toastMessage = "Settings saved") => {
      setPrefs(next);
      setFeedbackPrefsSnapshot(next);
      try {
        await savePreferences(next);
        await syncGeneralPreferencesToNative(next.general);
        toast.success(toastMessage);
      } catch {
        toast.error("Could not save settings to disk.");
      }
    },
    [toast],
  );

  const handleGoogleConnect = useCallback(
    async (input: { webAppUrl: string; bridgeSecret: string }) => {
      const status = await connectGoogle(input);
      const patch: Partial<AppPreferences["google"]> = { ...status };
      if (input.webAppUrl.trim()) {
        patch.appsScriptWebAppUrl = input.webAppUrl.trim();
        patch.responseAccess = "anyone_with_link";
        patch.emailCollectionMode = "RESPONDER_INPUT";
      }
      await persistPrefs(
        {
          ...prefs,
          google: { ...prefs.google, ...patch },
        },
        `Connected as ${status.accountEmail}`,
      );
    },
    [connectGoogle, persistPrefs, prefs],
  );

  const handleGoogleDisconnect = useCallback(async () => {
    await disconnectGoogle();
    await persistPrefs(
      {
        ...prefs,
        google: {
          ...prefs.google,
          appsScriptWebAppUrl: "",
          accountEmail: "",
          formsConnected: false,
          gmailConnected: false,
        },
      },
      "Google disconnected",
    );
  }, [disconnectGoogle, persistPrefs, prefs]);

  const patchGooglePrefs = useCallback(
    async (patch: Partial<AppPreferences["google"]>) => {
      await persistPrefs({ ...prefs, google: { ...prefs.google, ...patch } });
    },
    [persistPrefs, prefs],
  );

  const onTestJira = async () => {
    setBusy(true);
    const result = await testJiraConnectionSaved();
    if (result.label === "Connected") {
      toast.success("Jira connection succeeded");
    } else {
      toast.error(`Jira connection failed: ${result.detail}`);
    }
    setBusy(false);
  };

  const onTestBamboo = async () => {
    setBusy(true);
    const result = await testBambooConnectionSaved();
    if (result.label === "Connected") {
      toast.success("Bamboo connection succeeded");
    } else {
      toast.error(`Bamboo connection failed: ${result.detail}`);
    }
    setBusy(false);
  };

  const onSaveJiraToken = async (token: string) => {
    setBusy(true);
    try {
      await updateJiraToken(token);
      await refreshConnection();
      toast.success("Jira token updated");
    } finally {
      setBusy(false);
    }
  };

  const onSaveBambooKey = async (apiKey: string) => {
    setBusy(true);
    try {
      await updateBambooApiKey(apiKey);
      await refreshConnection();
      toast.success("Bamboo API key updated");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-content settings-layout">
      <PageSubnav
        items={SECTIONS}
        activeId={section}
        onChange={setSection}
        ariaLabel="Settings sections"
      />

      {section === "general" ? (
        <div className="settings-panel">
          <p className="settings-intro">Appearance and startup behavior.</p>
          <div className="settings-group">
            <span className="settings-row__label">Theme</span>
            <SegmentedControl
              ariaLabel="Theme preference"
              value={preference}
              options={THEME_OPTIONS}
              onChange={(value) => {
                setPreference(value);
                toast.success("Settings saved");
              }}
            />
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-row__text">
              <span className="settings-toggle-row__label">Launch Metrio at login</span>
            </div>
            <Switch
              aria-label="Launch Metrio at login"
              checked={prefs.general.launchAtLogin}
              onCheckedChange={(checked) => {
                void persistPrefs({
                  ...prefs,
                  general: { ...prefs.general, launchAtLogin: checked },
                });
              }}
            />
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-row__text">
              <span className="settings-toggle-row__label">
                Keep running in the menu bar when the window is closed
              </span>
            </div>
            <Switch
              aria-label="Keep running in the menu bar when the window is closed"
              checked={prefs.general.keepRunningInTray}
              onCheckedChange={(checked) => {
                void persistPrefs({
                  ...prefs,
                  general: { ...prefs.general, keepRunningInTray: checked },
                });
              }}
            />
          </div>
        </div>
      ) : null}

      {section === "connections" ? (
        <div className="settings-panel">
          <p className="settings-intro">
            Manage secure credentials for your company integrations.
          </p>

          <div className="settings-group">
            <span className="settings-row__label">Work email</span>
            <Input
              readOnly
              value={connection?.workEmail || prefs.workEmail || "—"}
            />
            <p className="settings-row__hint">
              Used to match your Metrio account with Jira and Bamboo.
            </p>
          </div>

          <div className="settings-integration">
            <div className="settings-integration__head">
              <span className="settings-row__label">Jira</span>
              <span
                className={
                  connection?.hasJiraToken
                    ? "settings-status-badge settings-status-badge--ok"
                    : "settings-status-badge settings-status-badge--offline"
                }
              >
                {connection?.hasJiraToken ? "Connected" : "Not configured"}
              </span>
            </div>
            <SettingsCredentialField
              label="Token"
              hasValue={Boolean(connection?.hasJiraToken)}
              busy={busy}
              onSave={onSaveJiraToken}
            />
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void onTestJira()}>
              Test connection
            </Button>
          </div>

          <div className="settings-integration">
            <div className="settings-integration__head">
              <span className="settings-row__label">BambooHR</span>
              <span
                className={
                  connection?.hasBambooApiKey
                    ? "settings-status-badge settings-status-badge--ok"
                    : "settings-status-badge settings-status-badge--offline"
                }
              >
                {connection?.hasBambooApiKey ? "Connected" : "Not configured"}
              </span>
            </div>
            <SettingsCredentialField
              label="API key"
              hasValue={Boolean(connection?.hasBambooApiKey)}
              busy={busy}
              onSave={onSaveBambooKey}
            />
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void onTestBamboo()}>
              Test connection
            </Button>
          </div>

          <GoogleConnectionPanel
            prefs={prefs}
            loading={googleBusy}
            message={null}
            mode="settings"
            showAdvanced={false}
            onConnect={handleGoogleConnect}
            onReconnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
            onUpdatePrefs={patchGooglePrefs}
          />
        </div>
      ) : null}

      {section === "digests" ? (
        <DigestSettingsPanel
          prefs={prefs}
          onPersist={(next) => persistPrefs(next)}
        />
      ) : null}

      {section === "company" ? <CompanySettingsPanel /> : null}

      {section === "about" ? <AboutSettingsPanel /> : null}

      {section === "operational-rules" ? (
        <OperationalRulesSettingsPanel
          prefs={prefs}
          onPersist={(next) => persistPrefs(next, "Attention rules saved")}
        />
      ) : null}

      {section === "notifications" ? (
        <div className="settings-panel">
          <p className="settings-intro">
            Choose which notifications Metrio may send to macOS. In-app activity
            history stays available in the Notification Center.
          </p>
          <div className="settings-notification-list">
            {NOTIFICATION_ROWS.map((row) => (
              <div key={row.key} className="settings-notification-row">
                <div className="settings-notification-row__text">
                  <span className="settings-notification-row__label">{row.label}</span>
                  <span className="settings-notification-row__description">
                    {row.description}
                  </span>
                </div>
                <Switch
                  aria-label={row.label}
                  checked={prefs.notifications[row.key]}
                  onCheckedChange={(checked) => {
                    void persistPrefs({
                      ...prefs,
                      notifications: {
                        ...prefs.notifications,
                        [row.key]: checked,
                      },
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
