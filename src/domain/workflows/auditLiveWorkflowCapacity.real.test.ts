import { describe, expect, it, vi } from 'vitest';
import { diagnoseWorkflowIssues } from './workflowDiagnostics';
import { resolveWorkflowStage } from './resolveWorkflowStage';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { calculateWorkload, DEFAULT_WORKLOAD_THRESHOLDS } from '../workload/workloadEngine';
import type { AuditIssue } from '../jira/types';

const runAudit = process.env.METRIO_WORKFLOW_AUDIT === '1';

vi.mock('@tauri-apps/api/core', async () => {
  if (!runAudit) {
    return { invoke: vi.fn() };
  }
  const { metrioRealInvoke } = await import('../../test/helpers/metrioRealInvoke');
  return {
    invoke: (command: string, args?: Record<string, unknown>) =>
      metrioRealInvoke(command, args),
  };
});

function flattenGroupedIssues(
  grouped: Record<string, { issues?: AuditIssue[] }>,
): AuditIssue[] {
  const seen = new Set<string>();
  const out: AuditIssue[] = [];
  Object.values(grouped).forEach((block) => {
    (block.issues || []).forEach((issue) => {
      if (seen.has(issue.issueKey)) return;
      seen.add(issue.issueKey);
      out.push(issue);
    });
  });
  return out;
}

describe.skipIf(!runAudit)('read-only live workflow / capacity audit', () => {
  it(
    'prints before/after workload and WS workflow samples (read-only)',
    async () => {
      const { fetchPerformanceData } = await import(
        '../../services/performance/performanceDataService'
      );
      const { loadPreferences } = await import('../../platform/preferences');

      const prefs = await loadPreferences();
      const range = {
        from: prefs.reportFilters.dateFrom,
        to: prefs.reportFilters.dateTo,
        preset: 'custom' as const,
      };

      const data = await fetchPerformanceData(range, 'team', 'team');
      const params = data.reportData.params;
      const grouped = data.reportData.grouped || {};

      const lines: string[] = [];
      lines.push('=== Workload before/after (capacity model) ===');
      lines.push(
        'person | assigned | active | review | qa | wait | hold | estMonthlyH | capacity% | oldLevel→newLevel',
      );

      Object.entries(grouped).forEach(([userKey, block]) => {
        const issues = block.issues || [];
        const assigned = issues.length;
        const workload = calculateWorkload(
          issues,
          params,
          DEFAULT_WORKLOAD_THRESHOLDS,
        );
        const legacyLevel =
          workload.activeCount >= 10
            ? 'overloaded (legacy heuristic)'
            : workload.activeCount >= 6
              ? 'high (legacy heuristic)'
              : 'normal (legacy heuristic)';

        lines.push(
          [
            block.userLabel || userKey,
            assigned,
            workload.activeWorkCount ?? workload.activeCount,
            workload.reviewCount ?? 0,
            workload.qaCount ?? 0,
            workload.waitingCount ?? 0,
            workload.holdCount ?? 0,
            (workload.estimatedMonthlyHours ?? 0).toFixed(1),
            (workload.capacityLoadPercent ?? 0).toFixed(0),
            `${legacyLevel} → ${workload.level}`,
          ].join(' | '),
        );
      });

      lines.push('');
      lines.push('=== WSkins sample issues ===');
      const flat = flattenGroupedIssues(grouped);
      const wsSamples = flat
        .filter(
          (issue) =>
            issue.projectKey === 'WS' ||
            (issue.issueTypeName || '').toLowerCase().includes('skin') ||
            issue.isSubtask,
        )
        .slice(0, 12);

      wsSamples.forEach((issue) => {
        const profile = resolveWorkflowProfile(issue);
        const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
        lines.push(
          [
            issue.issueKey,
            issue.issueTypeName,
            issue.currentStatus,
            profile.id,
            stage.canonicalStage,
            stage.countsAsActiveWork,
            stage.countsAsCapacityContributor,
            stage.countsAsAttentionEligible,
            stage.isCompletion,
          ].join(' | '),
        );
      });

      lines.push('');
      lines.push('=== Unknown workflow combinations ===');
      const unknownCounts: Record<string, number> = {};
      flat.forEach((issue) => {
        const diag = diagnoseWorkflowIssues([issue])[0];
        if (!diag) return;
        if (diag.unmappedStatuses.length === 0) return;
        const key = `${issue.projectKey || '?'} | ${issue.issueTypeName} | ${issue.currentStatus}`;
        unknownCounts[key] = (unknownCounts[key] || 0) + 1;
      });
      Object.entries(unknownCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .forEach(([key, count]) => {
          lines.push(`${count} × ${key}`);
        });

      // eslint-disable-next-line no-console -- intentional read-only audit output
      console.info(lines.join('\n'));
      expect(data.reportData.teamKpi).toBeDefined();
    },
    600_000,
  );
});
