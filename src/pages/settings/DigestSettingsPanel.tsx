import { Switch } from "../../components/Switch/Switch";
import type { AppPreferences } from "../../platform/preferences";

const ROWS: {
  key: keyof AppPreferences["digests"];
  label: string;
  description: string;
}[] = [
  {
    key: "dailyBriefEnabled",
    label: "Daily brief",
    description: "Build a short daily summary from your Jira and Bamboo data.",
  },
  {
    key: "weeklyDigestEnabled",
    label: "Weekly digest",
    description: "Calendar-week summary for managers (Mon–Sun, local).",
  },
  {
    key: "showDailyOnHome",
    label: "Show daily brief on Dashboard",
    description: "Compact card with a link to the full brief.",
  },
  {
    key: "showWeeklyOnHome",
    label: "Show weekly digest on Dashboard",
    description: "Managers only.",
  },
  {
    key: "notifyDailyBrief",
    label: "Native notification — daily brief",
    description: "Off by default. No confidential details in the alert.",
  },
  {
    key: "notifyWeeklyDigest",
    label: "Native notification — weekly digest",
    description: "Off by default.",
  },
];

export interface DigestSettingsPanelProps {
  prefs: AppPreferences;
  onPersist: (next: AppPreferences) => Promise<void>;
}

export function DigestSettingsPanel({ prefs, onPersist }: DigestSettingsPanelProps) {
  return (
    <div className="settings-panel" data-testid="digest-settings">
      <p className="settings-intro">
        Deterministic summaries from loaded Metrio data. No generative AI.
      </p>
      <div className="settings-notification-list">
        {ROWS.map((row) => (
          <div key={row.key} className="settings-notification-row">
            <div className="settings-notification-row__text">
              <span className="settings-notification-row__label">{row.label}</span>
              <span className="settings-notification-row__description">
                {row.description}
              </span>
            </div>
            <Switch
              aria-label={row.label}
              checked={prefs.digests[row.key]}
              onCheckedChange={(checked) => {
                void onPersist({
                  ...prefs,
                  digests: { ...prefs.digests, [row.key]: checked },
                });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
