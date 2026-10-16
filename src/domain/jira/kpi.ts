import { buildWorkflowKpi } from '../workflows/buildWorkflowKpi';
import type { AuditIssue, KpiData, ReportParams } from './types';
import type { BuildWorkflowKpiOptions } from '../workflows/buildWorkflowKpi';

/** Port of legacy buildKpiFromIssues_ — workflow-profile aware. */
export function buildKpiFromIssues(
  issues: AuditIssue[],
  _transitionStats: Record<string, number>,
  params: ReportParams,
  options: BuildWorkflowKpiOptions = {},
): KpiData {
  return buildWorkflowKpi(issues || [], params, options);
}
