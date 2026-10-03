import { isGoogleOAuthConfigured } from "../../config/google";
import { isMetrioCloudConfigured } from "../../services/metrioCloud/metrioCloudClient";
import { testBambooConnectionSaved, testJiraConnectionSaved } from "../connectionTest";
import type { AppPreferences } from "../preferences";
import { GoogleSurveyClient } from "../../services/survey/googleSurveyClient";
import type { IntegrationHealthSnapshot } from "./types";

export interface ConnectionCheckRow {
  id: string;
  label: string;
  state: IntegrationHealthSnapshot["connectionState"];
  detail: string;
}

export async function runConnectionDiagnostics(
  prefs: AppPreferences,
): Promise<ConnectionCheckRow[]> {
  const rows: ConnectionCheckRow[] = [];

  const jira = await testJiraConnectionSaved();
  rows.push({
    id: "jira",
    label: "Jira",
    state:
      jira.label === "Connected"
        ? "connected"
        : jira.label === "Needs attention"
          ? "authentication_required"
          : "unavailable",
    detail: jira.detail,
  });

  const bamboo = await testBambooConnectionSaved();
  rows.push({
    id: "bamboo",
    label: "BambooHR",
    state:
      bamboo.label === "Connected"
        ? "connected"
        : bamboo.label === "Needs attention"
          ? "authentication_required"
          : "unavailable",
    detail: bamboo.detail,
  });

  rows.push({
    id: "confluence",
    label: "Confluence",
    state: prefs.credentials.jiraConfigured ? "connected" : "not_configured",
    detail: prefs.credentials.jiraConfigured
      ? "Search uses Jira-authenticated session (no separate test in this build)."
      : "Configure Jira to enable knowledge search.",
  });

  if (isMetrioCloudConfigured()) {
    rows.push({
      id: "backend",
      label: "Shared services",
      state: "connected",
      detail: "Backend URL configured.",
    });
  } else {
    rows.push({
      id: "backend",
      label: "Shared services",
      state: "not_configured",
      detail: "Cloud backend not configured for this workspace.",
    });
  }

  if (isGoogleOAuthConfigured(prefs.google)) {
    try {
      const client = new GoogleSurveyClient();
      const status = await client.getStatus();
      rows.push({
        id: "google",
        label: "Google",
        state: status.connected ? "connected" : "authentication_required",
        detail: status.connected
          ? `Forms ${status.forms_connected ? "ok" : "limited"} · Gmail ${status.gmail_connected ? "ok" : "limited"}`
          : "Google account not linked.",
      });
      rows.push({
        id: "calendar",
        label: "Google Calendar",
        state: status.calendar_connected ? "connected" : "permission_limited",
        detail: status.calendar_connected
          ? "Calendar read access granted."
          : "Calendar not enabled (optional).",
      });
    } catch {
      rows.push({
        id: "google",
        label: "Google",
        state: "unavailable",
        detail: "Could not read Google status.",
      });
    }
  } else {
    rows.push({
      id: "google",
      label: "Google",
      state: "not_configured",
      detail: "OAuth client not configured in this build.",
    });
  }

  return rows;
}

export function formatRelativeSync(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  return `${hours} h ago`;
}
