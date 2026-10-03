import { useState } from "react";
import { Button } from "../../components/Button/Button";
import type { AppPreferences } from "../../platform/preferences";
import { GoogleSurveyClient } from "../../services/survey/googleSurveyClient";
import { disconnectCalendarCache } from "../../hooks/useUpcomingMeetings";
import { GOOGLE_CALENDAR_READONLY_SCOPE_DOC } from "../../config/google";

export function CalendarSettingsPanel({
  prefs,
  onUpdatePrefs,
}: {
  prefs: AppPreferences;
  onUpdatePrefs: (patch: Partial<AppPreferences["google"]>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const linked = Boolean(prefs.google.accountEmail);
  const calendarOn = prefs.google.calendarConnected;

  const enableCalendar = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const client = new GoogleSurveyClient();
      await client.enableCalendar();
      const status = await client.getStatus();
      await onUpdatePrefs({
        calendarConnected: status.calendar_connected,
        accountEmail: status.account_email,
        formsConnected: status.forms_connected,
        gmailConnected: status.gmail_connected,
      });
      disconnectCalendarCache();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const refreshStatus = async () => {
    setBusy(true);
    try {
      const client = new GoogleSurveyClient();
      const status = await client.getStatus();
      await onUpdatePrefs({
        calendarConnected: status.calendar_connected,
        accountEmail: status.account_email,
        formsConnected: status.forms_connected,
        gmailConnected: status.gmail_connected,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-panel">
      <h2 className="settings-panel__title">Google Calendar</h2>
      <p className="settings-intro">
        Optional read-only access to upcoming meetings for 1:1 preparation on
        Home. Metrio does not store your full calendar history or use meeting
        attendance in performance scoring.
      </p>
      <p className="settings-intro settings-intro--muted">
        Scope: {GOOGLE_CALENDAR_READONLY_SCOPE_DOC}
      </p>
      {!linked ? (
        <p className="settings-intro">
          Connect Google for Feedback first, then enable Calendar here.
        </p>
      ) : (
        <div className="settings-inline-actions">
          <span
            className={
              calendarOn
                ? "settings-status-badge settings-status-badge--ok"
                : "settings-status-badge settings-status-badge--offline"
            }
          >
            {calendarOn ? "Calendar connected" : "Calendar not enabled"}
          </span>
          {!calendarOn ? (
            <Button type="button" disabled={busy} onClick={() => void enableCalendar()}>
              Enable Calendar access
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void refreshStatus()}>
              Refresh status
            </Button>
          )}
        </div>
      )}
      {message ? (
        <p className="settings-error" role="alert">{message}</p>
      ) : null}
    </div>
  );
}
