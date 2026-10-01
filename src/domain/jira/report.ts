import { isDateWithinRange } from './dates';
import { buildIssueEvents } from './events';
import { buildKpiFromIssues } from './kpi';
import { JIRA_CONFIG } from './config';
import {
  buildTeamIdentityIndex,
  findMatchingTeamMembersForIssue,
} from './users';
import type {
  AuditIssue,
  AuditReportData,
  GroupedUserBlock,
  ReportParams,
  TeamIdentityIndex,
  TeamUser,
} from './types';

function safeGet<T>(obj: unknown, path: string[]): T | null {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return null;
  }, obj) as T | null;
}

function getIssueTypeName(issue: unknown): string {
  return safeGet<string>(issue, ['fields', 'issuetype', 'name']) || 'none';
}

function extractFieldDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (v.value !== undefined) return String(v.value);
    if (v.name !== undefined) return String(v.name);
    if (v.displayName !== undefined) return String(v.displayName);
    if (v.label !== undefined) return String(v.label);
  }
  return '';
}

function getContentTypeValue(issue: unknown): string {
  if (!issue) return 'none';
  if (!JIRA_CONFIG.CONTENT_TYPE_FIELD) return 'none';

  const value = safeGet<unknown>(issue, ['fields', JIRA_CONFIG.CONTENT_TYPE_FIELD]);
  if (value === null || value === undefined || value === '') return 'none';

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(extractFieldDisplayValue).filter(Boolean).join(', ') || 'none';
  }

  return extractFieldDisplayValue(value) || 'none';
}

function isDesignImprovement(issue: unknown): boolean {
  return (
    String(getIssueTypeName(issue)).trim().toLowerCase() ===
    String(JIRA_CONFIG.DESIGN_IMPROVEMENT_TYPE_NAME).trim().toLowerCase()
  );
}

function getAssigneeName(issue: unknown): string {
  const assignee = safeGet<{ displayName?: string; accountId?: string; emailAddress?: string }>(
    issue,
    ['fields', 'assignee'],
  );
  if (!assignee) return '';
  return assignee.displayName || assignee.accountId || assignee.emailAddress || '';
}

export interface EpicInfo {
  key: string;
  summary: string;
  issueObj: unknown;
}

export async function resolveEpicInfo(
  issue: unknown,
  issueCache: Record<string, unknown>,
  fetchIssueByKey: (key: string) => Promise<unknown>,
): Promise<EpicInfo | null> {
  const issueTypeName = String(getIssueTypeName(issue)).toLowerCase();

  if (issueTypeName === 'epic') {
    const key = safeGet<string>(issue, ['key']) || '';
    return {
      key,
      summary: safeGet<string>(issue, ['fields', 'summary']) || '',
      issueObj: issue,
    };
  }

  const parent = safeGet<{ key?: string; fields?: { issuetype?: { name?: string }; summary?: string } }>(
    issue,
    ['fields', 'parent'],
  );

  if (parent) {
    const parentTypeName = parent.fields?.issuetype?.name || '';
    const parentSummary = parent.fields?.summary || '';
    if (String(parentTypeName).toLowerCase() === 'epic') {
      return {
        key: parent.key || '',
        summary: parentSummary,
        issueObj: parent,
      };
    }
    if (!parentTypeName && parent.key) {
      let cached = issueCache[parent.key];
      if (!cached) {
        cached = await fetchIssueByKey(parent.key);
        issueCache[parent.key] = cached;
      }
      if (cached && String(getIssueTypeName(cached)).toLowerCase() === 'epic') {
        return {
          key: parent.key,
          summary: safeGet<string>(cached, ['fields', 'summary']) || '',
          issueObj: cached,
        };
      }
    }
  }

  if (JIRA_CONFIG.EPIC_LINK_FIELD) {
    const epicLinkKey = safeGet<string>(issue, ['fields', JIRA_CONFIG.EPIC_LINK_FIELD]);
    if (epicLinkKey) {
      let epicIssue = issueCache[epicLinkKey];
      if (!epicIssue) {
        epicIssue = await fetchIssueByKey(epicLinkKey);
        issueCache[epicLinkKey] = epicIssue;
      }
      if (epicIssue) {
        return {
          key: epicLinkKey,
          summary: safeGet<string>(epicIssue, ['fields', 'summary']) || '',
          issueObj: epicIssue,
        };
      }
    }
  }

  return null;
}

function buildTeamSummaryColumns(grouped: Record<string, GroupedUserBlock>): string[] {
  const preferredOrder = [
    'TODO → In Progress',
    'To Do → In Progress',
    'Open → In Progress',
    'Backlog → In Progress',
    'In Progress → In Review',
    'In Progress → Review',
    'In Review → Done',
    'In Review → Approved',
    'Approved → Published',
    'Approved → Closed',
    'Published → Closed',
    'In Progress → On Hold',
    'On Hold → In Progress',
    'In Progress → Cancelled',
    'In Progress → Canceled',
  ];

  const allKeys: Record<string, boolean> = {};
  Object.keys(grouped).forEach((userKey) => {
    Object.keys(grouped[userKey].transitionStats || {}).forEach((k) => {
      allKeys[k] = true;
    });
  });

  const ordered: string[] = [];
  preferredOrder.forEach((k) => {
    if (allKeys[k]) {
      ordered.push(k);
      delete allKeys[k];
    }
  });

  Object.keys(allKeys).sort().forEach((k) => ordered.push(k));
  return ordered;
}

function flattenGroupedIssues(grouped: Record<string, GroupedUserBlock>): AuditIssue[] {
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

function buildCombinedTransitionStats(grouped: Record<string, GroupedUserBlock>): Record<string, number> {
  const totals: Record<string, number> = {};

  Object.keys(grouped).forEach((userKey) => {
    const stats = grouped[userKey].transitionStats || {};
    Object.keys(stats).forEach((k) => {
      totals[k] = (totals[k] || 0) + stats[k];
    });
  });

  return totals;
}

export interface BuildReportInput {
  issues: unknown[];
  params: ReportParams;
  teamUsers: TeamUser[];
  teamIdentityIndex: TeamIdentityIndex;
  changelogByIssue?: Map<string, unknown[]>;
  fetchChangelog?: (issueKey: string) => Promise<unknown[]>;
  fetchIssueByKey: (key: string) => Promise<unknown>;
}

/** Port of legacy buildEnhancedJiraAuditReport_ */
export async function buildEnhancedJiraAuditReport(
  input: BuildReportInput,
): Promise<AuditReportData> {
  const { issues, params, teamUsers, teamIdentityIndex } = input;
  const grouped: Record<string, GroupedUserBlock> = {};
  let totalTransitions = 0;

  teamUsers.forEach((user) => {
    grouped[user.canonical] = {
      requestedUser: user.canonical,
      userLabel: teamIdentityIndex.canonicalToLabel[user.canonical] || user.canonical,
      issues: [],
      transitionStats: {},
    };
  });

  const issueCache: Record<string, unknown> = {};
  issues.forEach((issue) => {
    const key = safeGet<string>(issue, ['key']);
    if (key) issueCache[key] = issue;
  });

  for (const issue of issues) {
    const issueKey = safeGet<string>(issue, ['key']) || '';
    const issueSummary = safeGet<string>(issue, ['fields', 'summary']) || '';
    const issueCreated = safeGet<string>(issue, ['fields', 'created']) || '';
    const assignee = safeGet<{ accountId?: string; emailAddress?: string; displayName?: string }>(
      issue,
      ['fields', 'assignee'],
    );
    const assigneeName = getAssigneeName(issue);
    const issueTypeName = getIssueTypeName(issue) || 'none';
    const contentType = getContentTypeValue(issue) || 'none';
    const designImprovementType = isDesignImprovement(issue) ? issueTypeName : 'none';
    const currentStatus = safeGet<string>(issue, ['fields', 'status', 'name']) || '';

    const epicInfo = await resolveEpicInfo(issue, issueCache, input.fetchIssueByKey);

    const epicKey = epicInfo ? epicInfo.key : '';
    const epicSummary = epicInfo ? epicInfo.summary : 'none';
    const epicStatus = epicInfo
      ? safeGet<string>(epicInfo.issueObj, ['fields', 'status', 'name']) || 'none'
      : 'none';
    const epicContentType = epicInfo ? getContentTypeValue(epicInfo.issueObj) || 'none' : 'none';
    const epicDesignImprovementType =
      epicInfo && isDesignImprovement(epicInfo.issueObj)
        ? getIssueTypeName(epicInfo.issueObj)
        : 'none';

    const fullChangelogItems =
      input.changelogByIssue?.get(issueKey) ||
      (input.fetchChangelog ? await input.fetchChangelog(issueKey) : []);
    const filteredChangelog = fullChangelogItems.filter((history) =>
      isDateWithinRange((history as { created?: string }).created || '', params),
    );

    const fullEvents = buildIssueEvents(fullChangelogItems as never[], teamIdentityIndex);
    const rangeEvents = buildIssueEvents(filteredChangelog as never[], teamIdentityIndex);

    const matchedUsers = findMatchingTeamMembersForIssue(assignee, fullEvents, teamIdentityIndex);
    if (!matchedUsers.length) continue;

    const statusEventsInRange = rangeEvents.filter((e) => e.eventType === 'Status');
    totalTransitions += statusEventsInRange.length;

    matchedUsers.forEach((canonical) => {
      if (!grouped[canonical]) return;

      grouped[canonical].issues.push({
        issueKey,
        issueSummary,
        issueCreated,
        assigneeName,
        issueTypeName,
        contentType,
        designImprovementType,
        epicKey: epicKey || 'none',
        epicSummary: epicSummary || 'none',
        epicStatus: epicStatus || 'none',
        epicContentType: epicContentType || 'none',
        epicDesignImprovementType: epicDesignImprovementType || 'none',
        events: fullEvents,
        rangeEvents,
        currentStatus,
      });

      statusEventsInRange.forEach((e) => {
        const key = `${e.fromValue || ''} → ${e.toValue || ''}`;
        grouped[canonical].transitionStats[key] = (grouped[canonical].transitionStats[key] || 0) + 1;
      });
    });
  }

  Object.keys(grouped).forEach((userKey) => {
    grouped[userKey].issues.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  });

  const flatIssues = flattenGroupedIssues(grouped);
  const teamTransitionStats = buildCombinedTransitionStats(grouped);
  const teamKpi = buildKpiFromIssues(flatIssues, teamTransitionStats, params);
  const perUserKpi: Record<string, ReturnType<typeof buildKpiFromIssues>> = {};

  Object.keys(grouped).forEach((userKey) => {
    perUserKpi[userKey] = buildKpiFromIssues(
      grouped[userKey].issues || [],
      grouped[userKey].transitionStats || {},
      params,
    );
  });

  return {
    grouped,
    totalTransitions,
    teamSummaryColumns: buildTeamSummaryColumns(grouped),
    teamKpi,
    perUserKpi,
    params,
  };
}

export { buildTeamIdentityIndex };
