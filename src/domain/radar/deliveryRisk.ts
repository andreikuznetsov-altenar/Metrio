import { personRouteKey } from '../people/personDisplay';
import type { ReportParams } from '../jira/types';
import type { TeamSnapshot } from '../people/types';
import { getOperationalIssues } from '../people/ownedIssues';
import {
  classifyIssueAttention,
  formatStageAgeLabel,
  vacationDaysLabel,
} from './taskSignals';
import type { DeliveryRiskItem, RadarSeverity } from './types';
import { applyOwnerLeaveEscalation, type OwnerLeaveWindow } from './deliveryRiskSeverity';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';
import type { DeliveryDependencyIndex } from '../dependencies/dependencyTypes';

import { appNow } from "../../platform/appClock";
const SEVERITY_RANK: Record<RadarSeverity, number> = { critical: 0, warning: 1, info: 2 };

function maxSeverity(a: RadarSeverity, b: RadarSeverity): RadarSeverity {
  return SEVERITY_RANK[a] <= SEVERITY_RANK[b] ? a : b;
}

function ownerLeaveWindow(person: TeamSnapshot['persons'][number]): OwnerLeaveWindow {
  const state = person.availability.state;
  if (state === 'vacation_tomorrow') return 'tomorrow';
  if (state === 'vacation_soon') return 'soon';
  return 'none';
}

/**
 * Delivery Risk items. Severity is decided by `assessDeliveryRiskSeverity` (explicit rules over
 * current Task Health). Owner leave only escalates an existing risk by one bounded step; it never
 * makes a healthy or merely Info-level task Critical.
 */
export function buildDeliveryRiskItems(
  snapshot: TeamSnapshot,
  params: ReportParams,
  now = appNow(),
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
  dependencyIndex?: DeliveryDependencyIndex | null,
): DeliveryRiskItem[] {
  const items: DeliveryRiskItem[] = [];

  for (const person of snapshot.persons) {
    const routeKey = personRouteKey(person);
    const vacationLabel = vacationDaysLabel(person);
    const leaveWindow = ownerLeaveWindow(person);

    for (const issue of getOperationalIssues(person)) {
      const attention = classifyIssueAttention(issue, params, now, rules);
      if (!attention) continue;

      let severity = attention.severity;
      let reason = attention.reason;
      let rule: string = attention.rule;

      if (vacationLabel && leaveWindow !== 'none') {
        const escalated = applyOwnerLeaveEscalation(severity, leaveWindow);
        if (escalated !== severity) rule = `${rule}+leave`;
        severity = escalated;
        reason = `${reason}; owner vacation soon`;
      }

      const blockers = dependencyIndex?.activeBlockersByIssue[issue.issueKey];
      const primaryBlocker = blockers?.[0];
      if (primaryBlocker) {
        const lifted = maxSeverity(severity, 'warning');
        if (lifted !== severity) rule = `${rule}+W6`;
        severity = lifted;
        const blockReason = `Blocked by ${primaryBlocker.targetIssueKey}`;
        reason = reason.includes('Blocked by')
          ? reason
          : `${reason}; ${blockReason}`;
      }

      items.push({
        issueKey: issue.issueKey,
        summary: issue.issueSummary,
        personId: person.id,
        personName: person.bamboo.displayName,
        personRouteKey: routeKey,
        status: issue.currentStatus || '—',
        health: attention.health.status.replace(/_/g, ' '),
        healthStatus: attention.health.status,
        reasonCode: attention.reasonCode,
        stageKind: attention.health.stageKind,
        rule,
        stageLabel: formatStageAgeLabel(issue, now),
        reason,
        severity,
        issue,
      });
    }
  }

  return dedupeDeliveryRiskByIssueKey(items);
}

/** One row per Jira issue key, keeping the most severe; ties keep the first (stable). */
export function dedupeDeliveryRiskByIssueKey(items: DeliveryRiskItem[]): DeliveryRiskItem[] {
  const byKey = new Map<string, DeliveryRiskItem>();
  for (const item of items) {
    const key = item.issueKey.trim();
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || SEVERITY_RANK[item.severity] < SEVERITY_RANK[existing.severity]) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const diff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (diff !== 0) return diff;
    return a.issueKey.localeCompare(b.issueKey);
  });
}

export function buildDeliveryRiskItemsDeduped(
  snapshot: TeamSnapshot,
  params: ReportParams,
  now = appNow(),
): DeliveryRiskItem[] {
  return buildDeliveryRiskItems(snapshot, params, now);
}
