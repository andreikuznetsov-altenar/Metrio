import { describe, expect, it, vi } from 'vitest';
import {
  buildCapacityUiConsistencyReport,
  runWorkflowCapacityAuditFromPerformanceFetch,
} from './workflowCapacityAudit';

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

describe.skipIf(!runAudit)('read-only live workflow / capacity audit', () => {
  it(
    'prints audit, UI consistency, and distribution bucket parity (read-only)',
    async () => {
      const { fetchPerformanceData } = await import(
        '../../services/performance/performanceDataService'
      );
      const { loadPreferences } = await import('../../platform/preferences');
      const { buildPerformanceViewModels } = await import(
        '../../services/performance/performanceViewModel'
      );
      const { getFixtureUser } = await import('../../fixtures/currentUsers');

      const prefs = await loadPreferences();
      const range = {
        from: prefs.reportFilters.dateFrom,
        to: prefs.reportFilters.dateTo,
        preset: 'custom' as const,
      };
      const fetchResult = await fetchPerformanceData(range, 'team', 'team');
      const audit = await runWorkflowCapacityAuditFromPerformanceFetch(
        fetchPerformanceData,
        loadPreferences,
      );
      const selfId = getFixtureUser('lead').person.id;
      const vm = buildPerformanceViewModels(fetchResult, selfId);
      const consistency = buildCapacityUiConsistencyReport({
        audit,
        uiWorkload: vm.teamOverview?.workload ?? [],
      });

      // eslint-disable-next-line no-console -- intentional diagnostic output for local runs
      console.info(audit.textReport);
      // eslint-disable-next-line no-console -- intentional diagnostic output for local runs
      console.info(consistency.lines.join('\n'));
      expect(audit.personRows.length).toBeGreaterThan(0);
      expect(consistency.allMatch).toBe(true);
    },
    600_000,
  );
});
