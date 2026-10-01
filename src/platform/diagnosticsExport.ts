import { getBuildInfo } from '../config/build';
import { isGoogleOAuthConfigured } from '../config/google';
import type { AppPreferences } from './preferences';
import type { SurveyDataFile } from '../domain/survey/types';
import type { TeamDetectionResult } from '../services/bamboo/teamDetection';
import type { TeamSnapshot } from '../domain/people/types';

export interface SafeDiagnosticsExport {
  exportedAt: string;
  build: ReturnType<typeof getBuildInfo>;
  platform: string;
  connections: {
    jiraConfigured: boolean;
    bambooConfigured: boolean;
    googleConnected: boolean;
    oauthClientConfigured: boolean;
  };
  sync: AppPreferences['sync'];
  team: {
    mode: TeamDetectionResult['mode'] | 'unknown';
    reportingSource: TeamDetectionResult['reportingSource'] | 'unknown';
    teamSize: number;
    ambiguousSupervisorNames: number;
  };
  survey: {
    activeSurveyId: string | null;
    activeSurveyStatus: string | null;
    surveyCount: number;
    lastSendBatchId: string | null;
  };
  staleFlags: {
    bambooStale: boolean;
    jiraStale: boolean;
  };
  storageWarnings: string[];
  recentErrorCodes: string[];
}

export function buildSafeDiagnosticsExport(input: {
  prefs: AppPreferences;
  teamDetection: TeamDetectionResult | null;
  teamSnapshot: TeamSnapshot | null;
  surveyData: SurveyDataFile;
  storageWarnings?: string[];
  recentErrorCodes?: string[];
}): SafeDiagnosticsExport {
  const activeSurvey = input.surveyData.surveys.find(
    (s) => s.id === input.surveyData.activeSurveyId,
  );
  const lastBatch = activeSurvey?.sendBatches[activeSurvey.sendBatches.length - 1];

  return {
    exportedAt: new Date().toISOString(),
    build: getBuildInfo(),
    platform: navigator.platform,
    connections: {
      jiraConfigured: !!input.prefs.jiraBaseUrl && !!input.prefs.jiraEmail,
      bambooConfigured: !!input.prefs.bambooSubdomain,
      googleConnected: input.prefs.google.formsConnected,
      oauthClientConfigured: isGoogleOAuthConfigured(input.prefs.google),
    },
    sync: input.prefs.sync,
    team: {
      mode: input.teamDetection?.mode || 'unknown',
      reportingSource: input.teamDetection?.reportingSource || 'unknown',
      teamSize: input.teamSnapshot?.persons.length ?? 0,
      ambiguousSupervisorNames: input.teamDetection?.ambiguousSupervisorNames ?? 0,
    },
    survey: {
      activeSurveyId: input.surveyData.activeSurveyId,
      activeSurveyStatus: activeSurvey?.status ?? null,
      surveyCount: input.surveyData.surveys.length,
      lastSendBatchId: lastBatch?.id ?? null,
    },
    staleFlags: {
      bambooStale: input.prefs.sync.bambooStale,
      jiraStale: input.prefs.sync.jiraStale,
    },
    storageWarnings: input.storageWarnings || [],
    recentErrorCodes: input.recentErrorCodes || [],
  };
}

export async function exportDiagnosticsFile(payload: SafeDiagnosticsExport): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('diagnostics_export_file', {
    content: JSON.stringify(payload, null, 2),
  });
}
