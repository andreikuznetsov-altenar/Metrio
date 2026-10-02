import { buildCompletedCyclesFromSegments, getCycleSegments } from './cycles';
import { isCompletedCycleInReportingPeriod } from './cycleKpi';
import type { AuditIssue, AuditReportData, ReportParams } from './types';

function round2(value: number): number {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function getFirstPassStatus(percent: number): string {
  const value = Number(percent || 0);

  if (value >= 98) return 'Excellent';
  if (value >= 95) return 'Healthy';
  if (value >= 90) return 'Watch';
  if (value >= 80) return 'Risk';
  return 'Critical';
}

/** Port of legacy buildFirstPassRateMetrics_ */
export function buildFirstPassRateMetrics(reportData: {
  grouped: AuditReportData['grouped'];
  params: ReportParams;
}) {
  const issues = flattenGroupedIssues(reportData.grouped || {});

  let completedTasks = 0;
  let officialNotFirstPass = 0;
  let operationalNotFirstPass = 0;

  issues.forEach((issue) => {
    const segments = getCycleSegments(issue, reportData.params || ({} as ReportParams));
    const completedCycles = buildCompletedCyclesFromSegments(segments).filter((cycle) =>
      isCompletedCycleInReportingPeriod(cycle, reportData.params || ({} as ReportParams)),
    );

    completedCycles.forEach((cycle) => {
      completedTasks++;

      if (cycle.hasBackflow) {
        officialNotFirstPass++;
        operationalNotFirstPass++;
      }
    });
  });

  const officialAccepted = Math.max(0, completedTasks - officialNotFirstPass);
  const operationalAccepted = Math.max(0, completedTasks - operationalNotFirstPass);

  return {
    official: {
      completedTasks,
      notFirstPassTasks: officialNotFirstPass,
      acceptedFirstPassTasks: officialAccepted,
      firstPassRatePercent: completedTasks
        ? round2((officialAccepted / completedTasks) * 100)
        : 0,
    },
    operational: {
      completedTasks,
      notFirstPassTasks: operationalNotFirstPass,
      acceptedFirstPassTasks: operationalAccepted,
      firstPassRatePercent: completedTasks
        ? round2((operationalAccepted / completedTasks) * 100)
        : 0,
    },
  };
}

function flattenGroupedIssues(grouped: AuditReportData['grouped']): AuditIssue[] {
  const seen: Record<string, boolean> = {};
  const out: AuditIssue[] = [];

  Object.keys(grouped).forEach((userKey) => {
    (grouped[userKey].issues || []).forEach((issue) => {
      if (!seen[issue.issueKey]) {
        seen[issue.issueKey] = true;
        out.push(issue);
      }
    });
  });

  return out;
}
