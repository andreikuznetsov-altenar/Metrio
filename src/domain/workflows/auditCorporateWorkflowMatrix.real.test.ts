import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { JiraClient } from '../../services/jira/jiraClient';
import { loadPreferences } from '../../platform/preferences';
import { DEFAULT_WORKFLOW_MAPPINGS } from './defaultWorkflowMappings';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { resolveWorkflowStage } from './resolveWorkflowStage';
import { normalizeStatusKey } from './normalizeStatus';

const runAudit = process.env.METRIO_WORKFLOW_AUDIT === '1';

vi.mock('@tauri-apps/api/core', async () => {
  if (process.env.METRIO_WORKFLOW_AUDIT !== '1') return { invoke: vi.fn() };
  const { metrioRealInvoke } = await import('../../test/helpers/metrioRealInvoke');
  return {
    invoke: (command: string, args?: Record<string, unknown>) =>
      metrioRealInvoke(command, args),
  };
});

interface JiraIssue {
  key?: string;
  fields?: {
    project?: { key?: string };
    issuetype?: { name?: string; subtask?: boolean };
    status?: { name?: string };
  };
}

interface JiraHistory {
  items?: Array<{ field?: string; fromString?: string; toString?: string }>;
}

interface JiraProjectIssueTypeStatuses {
  name?: string;
  subtask?: boolean;
  statuses?: Array<{
    name?: string;
    statusCategory?: { key?: string; name?: string };
  }>;
}

describe.skipIf(!runAudit)('read-only corporate workflow matrix audit', () => {
  it(
    'samples every configured project and resolves current and historical statuses',
    async () => {
      const prefs = await loadPreferences();
      const jira = new JiraClient({
        baseUrl: prefs.jiraBaseUrl,
        email: prefs.jiraEmail,
      });
      const requestedProject = process.env.METRIO_WORKFLOW_PROJECT?.trim().toUpperCase();
      const projects = [...new Set(DEFAULT_WORKFLOW_MAPPINGS.map((m) => m.projectKey))]
        .filter((projectKey) => !requestedProject || projectKey === requestedProject);
      const rows: string[] = [];
      const metadataRows: string[] = [];
      const metadataUnmapped: string[] = [];
      const unverified: string[] = [];

      for (const projectKey of projects) {
        const workflowMetadata = await invoke<JiraProjectIssueTypeStatuses[]>(
          'jira_get_project_statuses',
          {
            config: { baseUrl: prefs.jiraBaseUrl, email: prefs.jiraEmail },
            projectKey,
          },
        );
        for (const issueType of workflowMetadata || []) {
          for (const status of issueType.statuses || []) {
            const statusName = status.name || 'Unknown';
            const metadataContext = {
              issueKey: `${projectKey}-METADATA`,
              projectKey,
              issueTypeName: issueType.name || 'Unknown',
              isSubtask: issueType.subtask,
              currentStatus: statusName,
              events: [],
            };
            const metadataProfile = resolveWorkflowProfile(metadataContext);
            if (!metadataProfile.statusToCanonical[normalizeStatusKey(statusName)]) {
              metadataUnmapped.push(
                `${projectKey} | ${issueType.name || 'Unknown'} | ${statusName} | ${metadataProfile.id}`,
              );
            }
            metadataRows.push([
              projectKey,
              issueType.name || 'Unknown',
              issueType.subtask ? 'subtask' : 'standard',
              statusName,
              status.statusCategory?.key || status.statusCategory?.name || 'unknown-category',
            ].join(' | '));
          }
        }

        const issues = (await jira.searchIssues(
          `project = "${projectKey}" ORDER BY updated DESC`,
          50,
          'project,issuetype,status',
        )) as JiraIssue[];
        if (!issues.length) {
          unverified.push(`${projectKey}: no readable issues`);
          continue;
        }

        const combinations = new Map<string, {
          issueType: string;
          status: string;
          issue: JiraIssue;
          historical: boolean;
        }>();
        for (const issue of issues) {
          const issueType = issue.fields?.issuetype?.name || 'Unknown';
          const status = issue.fields?.status?.name || 'Unknown';
          combinations.set(`${issueType}\u0000${status}`, {
            issueType,
            status,
            issue,
            historical: false,
          });
        }

        for (const issue of issues.slice(0, 3)) {
          if (!issue.key) continue;
          const histories = (await jira.fetchAllChangelog(issue.key)) as JiraHistory[];
          for (const history of histories) {
            for (const item of history.items || []) {
              if (item.field?.toLowerCase() !== 'status') continue;
              for (const status of [item.fromString, item.toString]) {
                if (!status) continue;
                const issueType = issue.fields?.issuetype?.name || 'Unknown';
                const key = `${issueType}\u0000${status}`;
                combinations.set(key, { issueType, status, issue, historical: true });
              }
            }
          }
        }

        for (const row of combinations.values()) {
          const issueContext = {
            issueKey: row.issue.key || `${projectKey}-UNKNOWN`,
            projectKey,
            issueTypeName: row.issueType,
            isSubtask: row.issue.fields?.issuetype?.subtask,
            currentStatus: row.status,
            events: [],
          };
          const profile = resolveWorkflowProfile(issueContext);
          const stage = resolveWorkflowStage(profile, row.status);
          rows.push([
            projectKey,
            row.issueType,
            row.status,
            profile.id,
            stage.canonicalStage,
            stage.isMapped ? 'mapped' : 'UNMAPPED',
            row.historical ? 'history' : 'current',
          ].join(' | '));
        }
      }

      // eslint-disable-next-line no-console -- intentional local read-only diagnostic
      console.info([
        '=== Corporate Jira workflow matrix (read-only sample) ===',
        'project | issue type | raw status | profile | canonical | mapping | source',
        ...rows.sort(),
        ...(unverified.length
          ? ['=== WORKFLOW MAPPING UNVERIFIED ===', ...unverified]
          : []),
        '=== Jira workflow status metadata ===',
        'project | issue type | kind | raw status | Jira status category',
        ...metadataRows.sort(),
      ].join('\n'));

      expect(rows.length).toBeGreaterThan(0);
      expect(metadataUnmapped, metadataUnmapped.join('\n')).toEqual([]);
    },
    600_000,
  );
});
