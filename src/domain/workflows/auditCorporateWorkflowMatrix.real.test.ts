import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { JiraClient } from '../../services/jira/jiraClient';
import { loadPreferences } from '../../platform/preferences';
import { DEFAULT_WORKFLOW_MAPPINGS } from './defaultWorkflowMappings';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { isExplicitProfileStatus, resolveWorkflowStage } from './resolveWorkflowStage';
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
    summary?: string;
  };
}

const TARGET_STATUS_SAMPLES: Array<{
  project: string;
  status: string;
  issueType?: string;
}> = [
  { project: 'UX', status: 'Need to Fix' },
  { project: 'AGTC', status: 'Provider', issueType: 'Provider' },
  { project: 'AIVA', status: 'Cancel' },
  { project: 'AGP', status: 'New' },
  { project: 'AGP', status: 'TODO' },
  { project: 'AGP', status: 'In Review' },
  { project: 'AGP', status: 'Testing on Stage' },
  { project: 'AGP', status: 'Ready for Release' },
  { project: 'AGP', status: 'Cancelled' },
  { project: 'ADF', status: 'Quality Assurance' },
  { project: 'ADF', status: 'Rejected' },
  { project: 'ADF', status: 'Release Candidate' },
  { project: 'PRD', status: 'A. Open' },
  { project: 'PRD', status: 'Analysis' },
  { project: 'PRD', status: 'Handover Completed' },
  { project: 'ARCH', status: 'Request for Approval' },
  { project: 'ARCH', status: 'Request for Comments' },
  { project: 'ARCH', status: 'Paused' },
  { project: 'ARCH', status: 'Suspended' },
  { project: 'ARCH', status: 'Process Exception: Concluded de facto' },
  { project: 'CRC', status: 'Queue' },
  { project: 'CRC', status: 'Translation' },
  { project: 'CRC', status: 'Proofreading' },
  { project: 'CRC', status: 'Publish' },
  { project: 'CIT', status: 'Investigating' },
  { project: 'CIT', status: 'Ongoing' },
  { project: 'CIT', status: 'Ready for Scan' },
];

function quoteJql(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
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
      const inferredCorporate: string[] = [];
      const unverified: string[] = [];
      const targetTransitionRows: string[] = [];
      const targetUnmapped: string[] = [];

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
          const explicit = isExplicitProfileStatus(profile, row.status);
          if (!explicit && !row.historical) {
            inferredCorporate.push(
              `${projectKey} | ${row.issueType} | ${row.status} | ${profile.id} | ${stage.canonicalStage} | ${stage.diagnosticCode || 'unmapped'}`,
            );
          }
          rows.push([
            projectKey,
            row.issueType,
            row.status,
            profile.id,
            stage.canonicalStage,
            explicit ? 'explicit' : stage.diagnosticCode || 'UNMAPPED',
            row.historical ? 'history' : 'current',
          ].join(' | '));
        }
      }

      for (const target of TARGET_STATUS_SAMPLES) {
        const currentJql = [
          `project = ${quoteJql(target.project)}`,
          `status = ${quoteJql(target.status)}`,
          target.issueType ? `issuetype = ${quoteJql(target.issueType)}` : '',
        ]
          .filter(Boolean)
          .join(' AND ');
        let sampled = (await jira.searchIssues(
          currentJql,
          3,
          'project,issuetype,status,summary',
        )) as JiraIssue[];
        let source = 'current';
        if (!sampled.length) {
          const wasJql = [
            `project = ${quoteJql(target.project)}`,
            `status WAS ${quoteJql(target.status)}`,
            target.issueType ? `issuetype = ${quoteJql(target.issueType)}` : '',
          ]
            .filter(Boolean)
            .join(' AND ');
          sampled = (await jira.searchIssues(
            `${wasJql} ORDER BY updated DESC`,
            2,
            'project,issuetype,status,summary',
          )) as JiraIssue[];
          source = 'historical';
        }
        if (!sampled.length) {
          targetTransitionRows.push(
            `${target.project} | ${target.issueType || '*'} | ${target.status} | NO_SAMPLE`,
          );
          continue;
        }
        for (const issue of sampled.slice(0, 2)) {
          if (!issue.key) continue;
          const issueType = issue.fields?.issuetype?.name || target.issueType || 'Unknown';
          const issueContext = {
            issueKey: issue.key,
            projectKey: target.project,
            issueTypeName: issueType,
            isSubtask: issue.fields?.issuetype?.subtask,
            currentStatus: target.status,
            events: [],
          };
          const profile = resolveWorkflowProfile(issueContext);
          const stage = resolveWorkflowStage(profile, target.status);
          if (!isExplicitProfileStatus(profile, target.status)) {
            targetUnmapped.push(
              `${issue.key} | ${target.status} | ${profile.id} | ${stage.canonicalStage}`,
            );
          }
          const histories = (await jira.fetchAllChangelog(issue.key)) as JiraHistory[];
          const adjacent: string[] = [];
          for (const history of histories) {
            for (const item of history.items || []) {
              if (item.field?.toLowerCase() !== 'status') continue;
              if (item.toString === target.status || item.fromString === target.status) {
                adjacent.push(`${item.fromString || '∅'} → ${item.toString || '∅'}`);
              }
            }
          }
          targetTransitionRows.push(
            [
              issue.key,
              issueType,
              target.status,
              profile.id,
              stage.canonicalStage,
              stage.isMapped ? 'explicit' : stage.diagnosticCode || 'UNMAPPED',
              source,
              adjacent.slice(0, 8).join('; ') || 'no-status-events',
            ].join(' | '),
          );
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
        '=== Target status transitions ===',
        'key | issue type | raw status | profile | canonical | mapping | source | adjacent transitions',
        ...targetTransitionRows,
        '=== Jira workflow status metadata ===',
        'project | issue type | kind | raw status | Jira status category',
        ...metadataRows.sort(),
      ].join('\n'));

      expect(rows.length).toBeGreaterThan(0);
      expect(metadataUnmapped, metadataUnmapped.join('\n')).toEqual([]);
      expect(inferredCorporate, inferredCorporate.join('\n')).toEqual([]);
      expect(targetUnmapped, targetUnmapped.join('\n')).toEqual([]);
    },
    600_000,
  );
});
