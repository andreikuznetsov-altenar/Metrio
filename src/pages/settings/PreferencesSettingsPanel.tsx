import { Switch } from "../../components/Switch/Switch";
import { useToast } from "../../components/Toast/ToastContext";
import type { AppPreferences } from "../../platform/preferences";
import { DigestSettingsCard } from "./DigestSettingsPanel";
import {
  setKeepRunningInTrayPreference,
  setLaunchAtLoginPreference,
} from "./generalDesktopPreferences";

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
    key: "calendarOneOnOnePrep",
    label: "1:1 preparation reminders",
    description:
      "Optional Metrio reminder 30–60 minutes before a 1:1 (off by default).",
  },
  {
    key: "integrationProblemAlerts",
    label: "Integration problems",
    description: "When Jira or BambooHR data cannot be refreshed.",
  },
];

export interface PreferencesSettingsPanelProps {
  prefs: AppPreferences;
  onPersist: (next: AppPreferences, message?: string) => Promise<void>;
}

export function PreferencesSettingsPanel({
  prefs,
  onPersist,
}: PreferencesSettingsPanelProps) {
  const { error: toastError } = useToast();

  return (
    <div className="settings-panel" data-testid="preferences-settings">
      <p className="settings-intro">
        Appearance, notifications, and briefs. Theme is available from your profile
        menu.
      </p>

      <section className="settings-card">
        <h3 className="settings-card__title">General</h3>
        <p className="settings-card__description">Startup and background behavior.</p>
        <div className="settings-toggle-stack">
          <div className="settings-toggle-row">
            <div className="settings-toggle-row__text">
              <span className="settings-toggle-row__label">Launch Metrio at login</span>
            </div>
            <Switch
              aria-label="Launch Metrio at login"
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
          <div className="settings-toggle-row">
            <div className="settings-toggle-row__text">
              <span className="settings-toggle-row__label">
                Keep running in menu bar when the window is closed
              </span>
            </div>
            <Switch
              aria-label="Keep running in the menu bar when the window is closed"
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
        </div>
      </section>

      <section className="settings-card">
        <h3 className="settings-card__title">Notifications</h3>
        <p className="settings-card__description">
          Choose which notifications Metrio may send to macOS. In-app activity
          history stays in Notification Center.
        </p>
        <div className="settings-toggle-stack">
          {NOTIFICATION_ROWS.map((row) => (
            <div key={row.key} className="settings-toggle-row settings-toggle-row--stacked">
              <div className="settings-toggle-row__text">
                <span className="settings-toggle-row__label">{row.label}</span>
                <span className="settings-toggle-row__description">{row.description}</span>
              </div>
              <Switch
                aria-label={row.label}
                checked={prefs.notifications[row.key]}
                onCheckedChange={(checked) => {
                  void onPersist({
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
      </section>

      <DigestSettingsCard prefs={prefs} onPersist={onPersist} />
    </div>
  );
}
