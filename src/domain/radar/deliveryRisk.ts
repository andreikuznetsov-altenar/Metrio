import { personRouteKey } from '../people/personDisplay';
import type { ReportParams } from '../jira/types';
import type { TeamSnapshot } from '../people/types';
import {
  classifyIssueAttention,
  formatStageAgeLabel,
  getActiveIssues,
  vacationDaysLabel,
} from './taskSignals';
import type { DeliveryRiskItem, RadarSeverity } from './types';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';
import type { DeliveryDependencyIndex } from '../dependencies/dependencyTypes';

function maxSeverity(a: RadarSeverity, b: RadarSeverity): RadarSeverity {
  const order = { critical: 0, warning: 1, info: 2 };
  return order[a] <= order[b] ? a : b;
}

export function buildDeliveryRiskItems(
  snapshot: TeamSnapshot,
  params: ReportParams,
  now = new Date(),
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
  dependencyIndex?: DeliveryDependencyIndex | null,
): DeliveryRiskItem[] {
  const items: DeliveryRiskItem[] = [];

  for (const person of snapshot.persons) {
    const routeKey = personRouteKey(person);
    const vacationLabel = vacationDaysLabel(person);

    for (const issue of getActiveIssues(person)) {
      const attention = classifyIssueAttention(issue, params, now, rules);
      if (!attention) continue;

      let severity = attention.severity;
      let reason = attention.reason;

      if (
        vacationLabel &&
        (person.availability.state === 'vacation_soon' ||
          person.availability.state === 'vacation_tomorrow')
      ) {
        severity = maxSeverity(severity, 'critical');
        reason = `${reason}; owner vacation soon`;
      }

      const blockers = dependencyIndex?.activeBlockersByIssue[issue.issueKey];
      const primaryBlocker = blockers?.[0];
      if (primaryBlocker) {
        severity = maxSeverity(severity, 'warning');
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
        stageLabel: formatStageAgeLabel(issue, now),
        reason,
        severity,
        issue,
      });
    }
  }

  return dedupeDeliveryRiskByIssueKey(items);
}

function dedupeDeliveryRiskByIssueKey(items: DeliveryRiskItem[]): DeliveryRiskItem[] {
  const order = { critical: 0, warning: 1, info: 2 };
  const byKey = new Map<string, DeliveryRiskItem>();
  for (const item of items) {
    const existing = byKey.get(item.issueKey);
    if (!existing || order[item.severity] < order[existing.severity]) {
      byKey.set(item.issueKey, item);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const diff = order[a.severity] - order[b.severity];
    if (diff !== 0) return diff;
    return a.issueKey.localeCompare(b.issueKey);
  });
}

export function buildDeliveryRiskItemsDeduped(
  snapshot: TeamSnapshot,
  params: ReportParams,
  now = new Date(),
): DeliveryRiskItem[] {
  return buildDeliveryRiskItems(snapshot, params, now);
}
