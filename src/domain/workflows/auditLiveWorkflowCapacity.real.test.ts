import { describe, expect, it, vi } from 'vitest';
import { runWorkflowCapacityAuditFromPerformanceFetch } from './workflowCapacityAudit';

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
    'prints before/after workload and WS workflow samples (read-only)',
    async () => {
      const { fetchPerformanceData } = await import(
        '../../services/performance/performanceDataService'
      );
      const { loadPreferences } = await import('../../platform/preferences');

      const result = await runWorkflowCapacityAuditFromPerformanceFetch(
        fetchPerformanceData,
        loadPreferences,
      );

      // eslint-disable-next-line no-console -- intentional diagnostic output for local runs
      console.info(result.textReport);
      expect(result.personRows.length).toBeGreaterThan(0);
    },
    600_000,
  );
});
