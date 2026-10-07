import type { AuditIssue, AuditReportData, ReportParams } from '../jira/types';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import {
  calculateWorkload,
  DEFAULT_WORKLOAD_THRESHOLDS,
  type WorkloadLevel,
  type WorkloadThresholds,
} from '../workload/workloadEngine';
import type { CapacityDataState } from './capacityWorkload';
import {
  CAPACITY_INSUFFICIENT_LABEL,
  capacityDataStateFromWorkload,
} from '../workload/capacityPresentation';
import { capacityDistribution } from '../home/executiveDashboardModel';
import type { WorkloadRow } from '../performance';
import { diagnoseWorkflowIssues } from './workflowDiagnostics';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { resolveWorkflowStage } from './resolveWorkflowStage';
import { calculateWskinsIssueKpiContribution } from './wskinsKpi';

function isInProgress(status: string): boolean {
  return /in progress/i.test(status || '');
}

function isInReview(status: string): boolean {
  return /review/i.test(status || '') && !/internal review/i.test(status);
}

/** Pre–Pass 8 workload level (read-only comparison). */
export function calculateLegacyWorkloadAssessment(
  issues: AuditIssue[],
  params: ReportParams,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
): { score: number; level: WorkloadLevel; activeCount: number } {
  let activeCount = 0;
  let inProgressCount = 0;
  let inReviewCount = 0;
  let problematicCount = 0;
  let atRiskCount = 0;
  let overdueCount = 0;

  issues.forEach((issue) => {
    const health = classifyTaskHealth({ issue, params });
    if (health.isCompleted) return;
    const status = issue.currentStatus || '';
    activeCount++;
    if (isInProgress(status)) inProgressCount++;
    if (isInReview(status)) inReviewCount++;
    if (health.status === 'problematic') problematicCount++;
    if (health.status === 'at_risk') atRiskCount++;
    if (health.reasons.some((r) => r.includes('exceeded'))) overdueCount++;
  });

  const score =
    activeCount +
    inProgressCount * 0.5 +
    inReviewCount * 0.25 +
    problematicCount * thresholds.problematicWeight +
    atRiskCount * thresholds.atRiskWeight +
    overdueCount * thresholds.overdueWeight;

  let level: WorkloadLevel = 'normal';
  if (score >= thresholds.overloadedScore || problematicCount >= 3) {
    level = 'overloaded';
  } else if (score >= thresholds.highScore || inProgressCount >= thresholds.highInProgress) {
    level = 'high';
  } else if (activeCount <= 2) {
    level = 'low';
  }

  return { score: Math.round(score * 10) / 10, level, activeCount };
}

export interface WorkflowCapacityPersonRow {
  personLabel: string;
  legacyScore: number;
  legacyLevel: WorkloadLevel;
  assigned: number;
  activeWorkCount: number;
  reviewCount: number;
  qaCount: number;
  waitingCount: number;
  holdCount: number;
  backlogCount: number;
  unknownCount: number;
  capacityContributorIssueCount: number;
  capacityHours: number;
  estimatedMonthlyHours: number;
  capacityLoadPercent: number;
  capacityLevel: WorkloadLevel;
  capacityDataState: CapacityDataState;
}

export interface WskinsSampleRow {
  issueKey: string;
  issueType: string;
  status: string;
  profileId: string;
  canonicalStage: string;
  activeWork: boolean;
  capacityWork: boolean;
  attentionEligible: boolean;
  contributorCompletionInPeriod: boolean;
  finalCompletionStage: boolean;
}

export interface WorkflowCapacityAuditResult {
  personRows: WorkflowCapacityPersonRow[];
  wskinsSamples: WskinsSampleRow[];
  downstreamAttentionFindings: string[];
  unknownCombinations: Array<{ key: string; count: number }>;
  textReport: string;
}

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

function pickWskinsSamples(flat: AuditIssue[], _params: ReportParams): AuditIssue[] {
  const ws = flat.filter(
    (issue) =>
      issue.projectKey === 'WS' ||
      (issue.issueTypeName || '').toLowerCase().includes('skin') ||
      issue.isSubtask,
  );
  const preferredStatuses = [
    'not started ws',
    'in progress',
    'internal review',
    'on approval',
    'pre-live',
    'live',
    'archived',
    'done',
  ];
  const picked: AuditIssue[] = [];
  const usedKeys = new Set<string>();
  preferredStatuses.forEach((want) => {
    const match = ws.find((issue) => {
      if (usedKeys.has(issue.issueKey)) return false;
      return (issue.currentStatus || '').toLowerCase().includes(want);
    });
    if (match) {
      picked.push(match);
      usedKeys.add(match.issueKey);
    }
  });
  ws.forEach((issue) => {
    if (picked.length >= 16) return;
    if (usedKeys.has(issue.issueKey)) return;
    picked.push(issue);
    usedKeys.add(issue.issueKey);
  });
  return picked;
}

const DOWNSTREAM_WS_STATUSES = ['Internal Review', 'On approval', 'PRE-LIVE', 'Live'];

export function runWorkflowCapacityAudit(reportData: AuditReportData): WorkflowCapacityAuditResult {
  const params = reportData.params;
  const grouped = reportData.grouped || {};
  const personRows: WorkflowCapacityPersonRow[] = [];

  Object.entries(grouped).forEach(([, block]) => {
    const issues = block.issues || [];
    const legacy = calculateLegacyWorkloadAssessment(issues, params);
    const workload = calculateWorkload(issues, params);
    personRows.push({
      personLabel: block.userLabel || 'unknown',
      legacyScore: legacy.score,
      legacyLevel: legacy.level,
      assigned: issues.length,
      activeWorkCount: workload.activeWorkCount ?? workload.activeCount,
      reviewCount: workload.reviewCount ?? 0,
      qaCount: workload.qaCount ?? 0,
      waitingCount: workload.waitingCount ?? 0,
      holdCount: workload.holdCount ?? 0,
      backlogCount: workload.backlogCount ?? 0,
      unknownCount: workload.unknownCount ?? 0,
      capacityContributorIssueCount: workload.capacityContributorIssueCount ?? 0,
      capacityHours:
        (workload.capacityBreakdown?.completedCycleHours ?? 0) +
        (workload.capacityBreakdown?.activeSegmentHours ?? 0),
      estimatedMonthlyHours: workload.estimatedMonthlyHours ?? 0,
      capacityLoadPercent: workload.capacityLoadPercent ?? 0,
      capacityLevel: workload.level,
      capacityDataState:
        workload.capacityDataState ?? capacityDataStateFromWorkload(workload),
    });
  });

  personRows.sort((a, b) => b.assigned - a.assigned);

  const flat = flattenGroupedIssues(grouped);
  const wskinsSamples: WskinsSampleRow[] = pickWskinsSamples(flat, params).map((issue) => {
    const profile = resolveWorkflowProfile(issue);
    const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
    const contrib = calculateWskinsIssueKpiContribution(issue, params);
    return {
      issueKey: issue.issueKey,
      issueType: issue.issueTypeName,
      status: issue.currentStatus || '',
      profileId: profile.id,
      canonicalStage: stage.canonicalStage,
      activeWork: stage.countsAsActiveWork,
      capacityWork: stage.countsAsCapacityContributor,
      attentionEligible: stage.countsAsAttentionEligible,
      contributorCompletionInPeriod: contrib.completedCount > 0,
      finalCompletionStage: stage.isCompletion,
    };
  });

  const downstreamAttentionFindings: string[] = [];
  flat
    .filter(
      (issue) =>
        issue.projectKey === 'WS' &&
        !issue.isSubtask &&
        (issue.issueTypeName || '').toLowerCase().includes('skin'),
    )
    .forEach((issue) => {
      const status = issue.currentStatus || '';
      if (!DOWNSTREAM_WS_STATUSES.some((s) => status.toLowerCase().includes(s.toLowerCase()))) {
        return;
      }
      const health = classifyTaskHealth({ issue, params });
      const staleOnly =
        health.reasons.length > 0 &&
        health.reasons.every((r) => r.includes('No activity')) &&
        (health.status === 'at_risk' || health.status === 'problematic');
      const notStable =
        health.status !== 'stable' &&
        health.status !== 'successful' &&
        health.status !== 'no_activity';
      if (staleOnly || (notStable && health.reasons.some((r) => r.includes('No activity')))) {
        downstreamAttentionFindings.push(
          `${issue.issueKey} @ ${status}: ${health.status} — ${health.reasons.join('; ')}`,
        );
      }
    });

  const unknownCounts: Record<string, number> = {};
  flat.forEach((issue) => {
    const diag = diagnoseWorkflowIssues([issue])[0];
    if (!diag?.unmappedStatuses.length) return;
    const key = `${issue.issueKey} | ${issue.projectKey || '?'} | ${issue.issueTypeName} | ${issue.currentStatus} | unmapped: ${diag.unmappedStatuses.join(', ')}`;
    unknownCounts[key] = (unknownCounts[key] || 0) + 1;
  });
  const unknownCombinations = Object.entries(unknownCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  const lines: string[] = [];
  lines.push('=== Workload legacy vs capacity (read-only) ===');
  lines.push(
    'person | capacity evidence | assigned | active | review | qa | wait | hold | backlog | unknown | contributors | capacityH | estMonthlyH | capacity% (raw) | legacyScore | legacyLevel',
  );
  personRows.forEach((row) => {
    const evidence =
      row.capacityDataState === 'insufficient_history'
        ? 'insufficient history'
        : `${row.capacityLevel} (measured)`;
    lines.push(
      [
        row.personLabel,
        evidence,
        row.assigned,
        row.activeWorkCount,
        row.reviewCount,
        row.qaCount,
        row.waitingCount,
        row.holdCount,
        row.backlogCount,
        row.unknownCount,
        row.capacityContributorIssueCount,
        row.capacityHours.toFixed(1),
        row.estimatedMonthlyHours.toFixed(1),
        row.capacityDataState === 'insufficient_history'
          ? `${row.capacityLoadPercent.toFixed(0)} (unmeasured)`
          : row.capacityLoadPercent.toFixed(0),
        row.legacyScore,
        row.legacyLevel,
      ].join(' | '),
    );
  });

  const legacyOver = personRows.filter((r) => r.legacyLevel === 'overloaded').length;
  const capacityOver = personRows.filter(
    (r) => r.capacityDataState === 'measured' && r.capacityLevel === 'overloaded',
  ).length;
  const insufficientCount = personRows.filter(
    (r) => r.capacityDataState === 'insufficient_history',
  ).length;
  lines.push('');
  lines.push(`legacy Overloaded count: ${legacyOver}`);
  lines.push(`capacity Overloaded count (measured): ${capacityOver}`);
  lines.push(`capacity insufficient history: ${insufficientCount}`);

  lines.push('');
  lines.push('=== WSkins samples ===');
  wskinsSamples.forEach((row) => {
    lines.push(
      [
        row.issueKey,
        row.issueType,
        row.status,
        row.profileId,
        row.canonicalStage,
        row.activeWork ? 'yes' : 'no',
        row.capacityWork ? 'yes' : 'no',
        row.attentionEligible ? 'yes' : 'no',
        row.contributorCompletionInPeriod ? 'yes' : 'no',
        row.finalCompletionStage ? 'yes' : 'no',
      ].join(' | '),
    );
  });

  lines.push('');
  lines.push('=== Downstream WS stale-attention findings ===');
  if (!downstreamAttentionFindings.length) {
    lines.push('none');
  } else {
    downstreamAttentionFindings.forEach((line) => lines.push(line));
  }

  lines.push('');
  lines.push('=== Unknown workflow combinations ===');
  if (!unknownCombinations.length) {
    lines.push('none');
  } else {
    unknownCombinations.slice(0, 40).forEach(({ key, count }) => {
      lines.push(`${count} × ${key}`);
    });
  }

  return {
    personRows,
    wskinsSamples,
    downstreamAttentionFindings,
    unknownCombinations,
    textReport: lines.join('\n'),
  };
}

export async function runWorkflowCapacityAuditFromPerformanceFetch(
  fetchPerformanceData: (
    range: { from: string; to: string; preset: 'custom' },
    target: 'team',
    audience: 'team',
  ) => Promise<{ reportData: AuditReportData }>,
  loadPreferences: () => Promise<{ reportFilters: { dateFrom: string; dateTo: string } }>,
): Promise<WorkflowCapacityAuditResult> {
  const prefs = await loadPreferences();
  const range = {
    from: prefs.reportFilters.dateFrom,
    to: prefs.reportFilters.dateTo,
    preset: 'custom' as const,
  };
  const data = await fetchPerformanceData(range, 'team', 'team');
  return runWorkflowCapacityAudit(data.reportData);
}

/** Read-only: compare audit rows to rendered Team Workload / distribution UI models. */
export function buildCapacityUiConsistencyReport(input: {
  audit: WorkflowCapacityAuditResult;
  uiWorkload: WorkloadRow[];
}): { lines: string[]; allMatch: boolean } {
  const lines: string[] = [];
  lines.push('=== Capacity UI consistency (audit vs view model) ===');
  let allMatch = true;

  for (const auditRow of input.audit.personRows) {
    const uiRow =
      input.uiWorkload.find(
        (row) =>
          row.personName === auditRow.personLabel ||
          row.personId === auditRow.personLabel,
      ) ??
      input.uiWorkload.find((row) =>
        auditRow.personLabel
          .toLowerCase()
          .includes((row.personName || row.personId).toLowerCase()),
      );

    const uiLabel = uiRow?.workload ?? '—';
    const uiState = uiRow?.capacityDataState ?? 'missing';
    const match =
      uiRow != null &&
      uiState === auditRow.capacityDataState &&
      (auditRow.capacityDataState === 'insufficient_history'
        ? uiLabel === CAPACITY_INSUFFICIENT_LABEL
        : uiLabel !== CAPACITY_INSUFFICIENT_LABEL);

    if (!match) allMatch = false;
    lines.push(
      [
        auditRow.personLabel,
        `audit=${auditRow.capacityDataState}`,
        `uiState=${uiState}`,
        `uiLabel=${uiLabel}`,
        match ? 'MATCH' : 'MISMATCH',
      ].join(' | '),
    );
  }

  const bucketLabels = ['Light', 'Balanced', 'Heavy', 'Overloaded', CAPACITY_INSUFFICIENT_LABEL] as const;
  const auditBuckets: Record<string, number> = Object.fromEntries(
    bucketLabels.map((label) => [label, 0]),
  );
  for (const row of input.audit.personRows) {
    if (row.capacityDataState === 'insufficient_history') {
      auditBuckets[CAPACITY_INSUFFICIENT_LABEL] += 1;
      continue;
    }
    const mapped =
      row.capacityLevel === 'low'
        ? 'Light'
        : row.capacityLevel === 'normal'
          ? 'Balanced'
          : row.capacityLevel === 'high'
            ? 'Heavy'
            : row.capacityLevel === 'overloaded'
              ? 'Overloaded'
              : 'Balanced';
    auditBuckets[mapped] += 1;
  }

  const uiDistribution = capacityDistribution(input.uiWorkload);
  lines.push('');
  lines.push('=== Capacity distribution buckets ===');
  for (const label of bucketLabels) {
    const auditCount = auditBuckets[label] ?? 0;
    const uiCount = uiDistribution.find((b) => b.label === label)?.count ?? 0;
    const match = auditCount === uiCount;
    if (!match) allMatch = false;
    lines.push(`${label}: audit=${auditCount} ui=${uiCount} ${match ? 'MATCH' : 'MISMATCH'}`);
  }

  return { lines, allMatch };
}
