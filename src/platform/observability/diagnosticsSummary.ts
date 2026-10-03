import type { AppPreferences } from "../preferences";
import type { ConnectionCheckRow } from "./connectionDiagnostics";
import type { ApiRequestCounts, RefreshMetrics } from "./types";
import { redactPath } from "./redaction";

export function buildDiagnosticsSummaryText(input: {
  prefs: AppPreferences;
  checks: ConnectionCheckRow[];
  buildLabel: string;
  refreshMetrics: RefreshMetrics;
  apiCounts: ApiRequestCounts;
  startup: Record<string, number>;
}): string {
  const lines = [
    input.buildLabel,
    "",
    "Integrations:",
    ...input.checks.map((c) => `- ${c.label}: ${c.state} — ${c.detail}`),
    "",
    `Jira last sync: ${input.prefs.sync.lastJiraSync ?? "never"}`,
    `Bamboo last sync: ${input.prefs.sync.lastBambooSync ?? "never"}`,
    "",
    "Refresh metrics:",
    `- requested ${input.refreshMetrics.refreshRequested}`,
    `- coalesced ${input.refreshMetrics.refreshCoalesced}`,
    `- completed ${input.refreshMetrics.refreshCompleted}`,
    `- failed ${input.refreshMetrics.refreshFailed}`,
    "",
    "API requests (session):",
    `- Jira ${input.apiCounts.jira}`,
    `- Bamboo ${input.apiCounts.bamboo}`,
    `- Confluence ${input.apiCounts.confluence}`,
    `- Google ${input.apiCounts.google}`,
    `- Backend ${input.apiCounts.backend}`,
    "",
    "Startup timings (ms):",
    ...Object.entries(input.startup).map(([k, v]) => `- ${k}: ${v}`),
  ];
  return redactPath(lines.join("\n"));
}
