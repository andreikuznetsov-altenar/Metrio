import { getBuildInfo } from "../../config/build";
import { buildSafeDiagnosticsExport } from "../diagnosticsExport";
import type { AppPreferences } from "../preferences";
import type { SurveyDataFile } from "../../domain/survey/types";
import type { TeamDetectionResult } from "../../services/bamboo/teamDetection";
import type { TeamSnapshot } from "../../domain/people/types";
import {
  assertNoSecretsInBundle,
  buildPreferencesSafeSnapshot,
  scrubSecretsFromText,
} from "./redaction";
import {
  getApiRequestCounts,
  getIntegrationHealthSnapshots,
  getRecentAppLogRecords,
  getRefreshMetrics,
  getStartupTimings,
} from "./observabilityStore";
import { runConnectionDiagnostics } from "./connectionDiagnostics";

export interface SupportBundleFile {
  name: string;
  content: string;
}

export function generateSupportBundleId(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MTR-${y}${m}${d}-${rand}`;
}

export async function buildSupportBundleFiles(input: {
  prefs: AppPreferences;
  teamDetection: TeamDetectionResult | null;
  teamSnapshot: TeamSnapshot | null;
  surveyData: SurveyDataFile;
  storageWarnings?: string[];
  forbiddenSecrets?: string[];
}): Promise<{ bundleId: string; files: SupportBundleFile[] }> {
  const bundleId = generateSupportBundleId();
  const diagnostics = buildSafeDiagnosticsExport({
    prefs: input.prefs,
    teamDetection: input.teamDetection,
    teamSnapshot: input.teamSnapshot,
    surveyData: input.surveyData,
    storageWarnings: input.storageWarnings,
    recentErrorCodes: [],
  });

  const integrationChecks = await runConnectionDiagnostics(input.prefs);

  const files: SupportBundleFile[] = [
    {
      name: "build-info.json",
      content: JSON.stringify(getBuildInfo(), null, 2),
    },
    {
      name: "diagnostics.json",
      content: JSON.stringify(
        {
          bundleId,
          exportedAt: new Date().toISOString(),
          diagnostics,
          startupTimings: getStartupTimings(),
          refreshMetrics: getRefreshMetrics(),
          apiRequestCounts: getApiRequestCounts(),
        },
        null,
        2,
      ),
    },
    {
      name: "integration-status.json",
      content: JSON.stringify(
        {
          checks: integrationChecks,
          health: getIntegrationHealthSnapshots(),
        },
        null,
        2,
      ),
    },
    {
      name: "preferences-safe.json",
      content: JSON.stringify(buildPreferencesSafeSnapshot(input.prefs), null, 2),
    },
    {
      name: "recent-logs.json",
      content: JSON.stringify(getRecentAppLogRecords(), null, 2),
    },
  ];

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const tail = await invoke<string>("logs_read_tail", { maxBytes: 64 * 1024 });
    if (tail.trim()) {
      files.push({
        name: "app-log-tail.txt",
        content: tail,
      });
    }
  } catch {
    /* browser / test env */
  }

  const sanitized = files.map((f) => ({
    ...f,
    content: scrubSecretsFromText(f.content),
  }));

  if (input.forbiddenSecrets?.length) {
    assertNoSecretsInBundle(
      sanitized.map((f) => f.content),
      input.forbiddenSecrets,
    );
  }

  return { bundleId, files: sanitized };
}

export async function exportSupportBundleZip(
  files: SupportBundleFile[],
  bundleId: string,
): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("support_bundle_export", {
    bundleId,
    files,
  });
}
