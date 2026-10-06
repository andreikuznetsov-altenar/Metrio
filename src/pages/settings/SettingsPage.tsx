import { useCallback, useEffect, useState } from "react";
import { readSavedConnection, type SavedConnection } from "../../app/connectionStorage";
import { setFeedbackPrefsSnapshot } from "../../app/feedbackPrefsBridge";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { useToast } from "../../components/Toast/ToastContext";
import { ATLASSIAN_API_TOKEN_URL, getBambooApiKeyHelpUrl } from "../../config/links";
import { openExternalUrl } from "../../platform/openExternal";
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
import { PageSubnav } from "../../shell/PageSubnav";
import type { SettingsSection } from "./types";
import { normalizeSettingsSection } from "./settingsSection";
import { GoogleConnectionPanel } from "../feedback/GoogleConnectionPanel";
import { CalendarSettingsPanel } from "./CalendarSettingsPanel";
import { disconnectCalendarCache } from "../../hooks/useUpcomingMeetings";
import { SettingsCredentialField } from "./SettingsCredentialField";
import "../page-content.css";
import { OperationalRulesSettingsPanel } from "./OperationalRulesSettingsPanel";
import { PreferencesSettingsPanel } from "./PreferencesSettingsPanel";
import { CompanyAppSettingsPanel } from "./CompanyAppSettingsPanel";
import { MetrioCloudSettingsPanel } from "./MetrioCloudSettingsPanel";
import "./settings.css";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "preferences", label: "Preferences" },
  { id: "connections", label: "Connections" },
  { id: "operational-rules", label: "Attention rules" },
  { id: "company-app", label: "Company & App" },
];

export interface SettingsPageProps {
  onReconnect?: () => void;
  initialSection?: SettingsSection | string;
}

export function SettingsPage({
  initialSection = "preferences",
}: SettingsPageProps) {
  const toast = useToast();
  const [section, setSection] = useState<SettingsSection>(() =>
    normalizeSettingsSection(initialSection),
  );
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [connection, setConnection] = useState<SavedConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const { connectGoogle, disconnectGoogle, loading: googleBusy } = useFeedbackSurveyStore();

  const refreshConnection = useCallback(async () => {
    setConnection(await readSavedConnection());
  }, []);

  useEffect(() => {
    setSection(normalizeSettingsSection(initialSection));
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
    disconnectCalendarCache();
    await persistPrefs(
      {
        ...prefs,
        google: {
          ...prefs.google,
          appsScriptWebAppUrl: "",
          accountEmail: "",
          formsConnected: false,
          gmailConnected: false,
          calendarConnected: false,
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

      {section === "preferences" ? (
        <PreferencesSettingsPanel prefs={prefs} onPersist={persistPrefs} />
      ) : null}

      {section === "connections" ? (
        <div className="settings-panel" data-testid="connections-settings">
          <p className="settings-intro">
            Manage secure credentials for your company integrations. Credentials are stored
            securely on this Mac.
          </p>

          <section className="settings-card settings-card--compact">
            <h3 className="settings-card__title">Work email</h3>
            <p className="settings-card__description">
              Used to match your Metrio profile with Jira and BambooHR.
            </p>
            <Input
              readOnly
              value={connection?.workEmail || prefs.workEmail || "—"}
            />
          </section>

          <section className="settings-card" data-testid="settings-jira-card">
            <div className="settings-card__head">
              <h3 className="settings-card__title">Jira</h3>
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
              label="API token"
              hasValue={Boolean(connection?.hasJiraToken)}
              busy={busy}
              onSave={onSaveJiraToken}
              securityHint="Stored securely on this Mac."
              editActions={
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onTestJira()}
                  >
                    Test connection
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    data-testid="jira-get-api-token"
                    onClick={() => void openExternalUrl(ATLASSIAN_API_TOKEN_URL)}
                  >
                    Get API token
                  </Button>
                </>
              }
            />
          </section>

          <section className="settings-card" data-testid="settings-bamboo-card">
            <div className="settings-card__head">
              <h3 className="settings-card__title">BambooHR</h3>
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
              securityHint="Stored securely on this Mac."
              editActions={
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onTestBamboo()}
                  >
                    Test connection
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    data-testid="bamboo-api-key-help"
                    onClick={() => void openExternalUrl(getBambooApiKeyHelpUrl())}
                  >
                    How to get API key
                  </Button>
                </>
              }
            />
          </section>

          <section className="settings-card">
            <MetrioCloudSettingsPanel />
          </section>

          <section className="settings-card settings-card--google" data-testid="settings-google-card">
            <div className="settings-card__head">
              <h3 className="settings-card__title">Google</h3>
            </div>
            <p className="settings-card__description">
              Connect Google to create and send Feedback surveys.
            </p>
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
          </section>

          <section className="settings-card">
            <CalendarSettingsPanel prefs={prefs} onUpdatePrefs={patchGooglePrefs} embedded />
          </section>
        </div>
      ) : null}

      {section === "operational-rules" ? (
        <OperationalRulesSettingsPanel
          prefs={prefs}
          onPersist={(next) => persistPrefs(next, "Attention rules saved")}
        />
      ) : null}

      {section === "company-app" ? (
        <CompanyAppSettingsPanel prefs={prefs} onPersist={persistPrefs} />
      ) : null}
    </div>
  );
}
