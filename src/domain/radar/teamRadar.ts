import {
  currentWorkloadForPerson,
  personAtRiskCount,
  personProblematicCount,
  personRouteKey,
} from '../people/personDisplay';
import type { Person } from '../people/types';
import type { ReportParams } from '../jira/types';
import type { TeamSnapshot } from '../people/types';
import { getOperationalIssues } from '../people/ownedIssues';
import {
  classifyIssueAttention,
  getActiveIssues,
  vacationDaysLabel,
  vacationRiskSeverity,
} from './taskSignals';
import type { RadarSeverity, TeamRadarItem, RadarSignal } from './types';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';

const SEVERITY_ORDER: Record<RadarSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function maxSeverity(a: RadarSeverity, b: RadarSeverity): RadarSeverity {
  return SEVERITY_ORDER[a] <= SEVERITY_ORDER[b] ? a : b;
}

function dedupeSignals(signals: RadarSignal[]): RadarSignal[] {
  const seen = new Set<string>();
  const result: RadarSignal[] = [];
  for (const signal of signals) {
    const key = `${signal.severity}:${signal.label}:${signal.issueKey || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(signal);
  }
  return result;
}

function buildPersonRadarItem(
  person: Person,
  params: ReportParams,
  teamAverageActive: number,
  now: Date,
  rules: OperationalRules,
): TeamRadarItem | null {
  const signals: RadarSignal[] = [];
  const relatedIssueKeys: string[] = [];
  let severity: RadarSeverity = 'info';

  const operationalIssues = getOperationalIssues(person);
  const atRiskCount = personAtRiskCount(person, params);
  const problematicCount = personProblematicCount(person, params);
  const currentWorkload = currentWorkloadForPerson(person);
  const workload = currentWorkload?.level || 'normal';
  const activeCount = currentWorkload?.activeCount ?? getActiveIssues(person).length;

  for (const issue of operationalIssues) {
    const attention = classifyIssueAttention(issue, params, now, rules);
    if (!attention) continue;
    severity = maxSeverity(severity, attention.severity);
    relatedIssueKeys.push(issue.issueKey);
    signals.push({
      id: `issue:${issue.issueKey}`,
      severity: attention.severity,
      label: `${issue.issueKey} — ${attention.reason}`,
      issueKey: issue.issueKey,
      issueSummary: issue.issueSummary,
    });
  }

  if (workload === 'overloaded') {
    severity = maxSeverity(severity, 'critical');
    signals.push({
      id: 'workload:overloaded',
      severity: 'critical',
      label: 'Overloaded workload',
    });
  } else if (workload === 'high' && atRiskCount >= 2) {
    severity = maxSeverity(severity, 'critical');
    signals.push({
      id: 'workload:high-risk',
      severity: 'critical',
      label: `High workload with ${atRiskCount} at-risk tasks`,
    });
  } else if (workload === 'high') {
    severity = maxSeverity(severity, 'warning');
    signals.push({
      id: 'workload:high',
      severity: 'warning',
      label: 'High workload',
    });
  }

  if (activeCount > teamAverageActive * 1.5 && activeCount >= 4 && workload !== 'overloaded') {
    severity = maxSeverity(severity, 'warning');
    signals.push({
      id: 'workload:above-team',
      severity: 'warning',
      label: 'Workload significantly above team average',
    });
  }

  const vacationSeverity = vacationRiskSeverity(person, atRiskCount, problematicCount);
  const vacationLabel = vacationDaysLabel(person);
  if (vacationSeverity && vacationLabel) {
    severity = maxSeverity(severity, vacationSeverity);
    const activeLabel = `${activeCount} active`;
    const riskLabel =
      atRiskCount > 0 || problematicCount > 0
        ? `${atRiskCount} at risk${problematicCount ? `, ${problematicCount} problematic` : ''}`
        : null;
    signals.push({
      id: 'vacation:upcoming',
      severity: vacationSeverity,
      label: riskLabel ? `${vacationLabel} · ${activeLabel} · ${riskLabel}` : `${vacationLabel} · ${activeLabel}`,
    });
  }

  const uniqueSignals = dedupeSignals(signals);
  if (!uniqueSignals.length) return null;

  const primaryAction =
    vacationSeverity === 'critical' || workload === 'overloaded' || workload === 'high'
      ? 'review_workload'
      : 'view_person';

  return {
    personId: person.id,
    personName: person.bamboo.displayName,
    personRouteKey: personRouteKey(person),
    severity,
    signals: uniqueSignals.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    relatedIssueKeys: [...new Set(relatedIssueKeys)],
    primaryAction,
    signalCount: uniqueSignals.length,
  };
}

export function buildTeamRadar(
  snapshot: TeamSnapshot,
  params: ReportParams,
  now = new Date(),
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): TeamRadarItem[] {
  if (snapshot.mode !== 'team') return [];

  const activeCounts = snapshot.persons.map(
    (p) => currentWorkloadForPerson(p)?.activeCount ?? getActiveIssues(p).length,
  );
  const teamAverageActive =
    activeCounts.length > 0
      ? activeCounts.reduce((sum, n) => sum + n, 0) / activeCounts.length
      : 0;

  const items = snapshot.persons
    .map((person) =>
      buildPersonRadarItem(person, params, teamAverageActive, now, rules),
    )
    .filter((item): item is TeamRadarItem => !!item);

  return items.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.signalCount - a.signalCount;
  });
}

export function summarizeTeamRadar(items: TeamRadarItem[]): {
  peopleNeedingAttention: number;
  criticalCount: number;
  warningCount: number;
} {
  return {
    peopleNeedingAttention: items.length,
    criticalCount: items.filter((i) => i.severity === 'critical').length,
    warningCount: items.filter((i) => i.severity === 'warning').length,
  };
}
