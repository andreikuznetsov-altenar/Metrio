import { resolveBambooSubdomain, resolveJiraBaseUrl } from "../../config/product";
import { buildJql, normalizeReportParams } from "../../domain/jira/jql";
import { buildEnhancedJiraAuditReport } from "../../domain/jira/report";
import { buildTeamIdentityIndex } from "../../domain/jira/users";
import type { TimeOffEntry } from "../../domain/people/availability";
import type { DateRangeKey } from "../../domain/performance";
import { dateRangeKeyToBounds } from "../../domain/performance/dateRangeParams";
import { resolveJiraIdentity, toPersonJiraIdentity } from "../../domain/people/identityResolver";
import { recordDailySnapshots } from "../../domain/snapshots/snapshotEngine";
import {
  getWorkEmail,
  loadPreferences,
} from "../../platform/preferences";
import { writeLog } from "../../platform/logger";
import type { OrgResolutionResult } from "../bamboo/orgResolver";
import { BambooClient } from "../bamboo/bambooClient";
import { resolveTeamScope } from "../bamboo/teamScope";
import { JiraClient } from "../jira/jiraClient";
import {
  buildTeamSnapshot,
  getWhosOutDateRange,
} from "../people/personService";
import {
  loadKpiSnapshots,
  saveKpiSnapshots,
} from "../snapshots/snapshotPersistence";
import type {
  PerformanceFetchResult,
  PerformanceIdentityResolution,
} from "./performanceTypes";

export type { PerformanceFetchResult, PerformanceIdentityResolution } from "./performanceTypes";

export function scopeOrgForPerformance(
  org: OrgResolutionResult,
): OrgResolutionResult {
  const scope = resolveTeamScope(org);
  if (!scope) {
    return org;
  }

  const directReports =
    scope.mode === "manager"
      ? scope.members.filter((member) => member.id !== scope.self.id)
      : [];

  return {
    ...org,
    ok: true,
    employee: scope.self,
    directReports,
    fullTeam: [],
    mode:
      scope.mode === "manager"
        ? "team"
        : org.mode === "personal_limited"
          ? "personal_limited"
          : "personal",
  };
}

function issueKeyFromRaw(issue: unknown): string {
  if (!issue || typeof issue !== "object") return "";
  const key = (issue as { key?: string }).key;
  return typeof key === "string" ? key : "";
}

export async function fetchPerformanceData(
  dateRangeKey: DateRangeKey,
): Promise<PerformanceFetchResult> {
  const prefs = await loadPreferences();
  const partialWarnings: string[] = [];

  if (!prefs.setup.completed || !prefs.teamDetection?.ok) {
    throw new Error("Workspace is not ready for performance data.");
  }

  const org = scopeOrgForPerformance(prefs.teamDetection);
  const scope = resolveTeamScope(org);
  if (!scope) {
    throw new Error("Could not resolve team scope.");
  }

  const workEmail = getWorkEmail(prefs);
  const jira = new JiraClient({
    baseUrl: resolveJiraBaseUrl(),
    email: workEmail,
  });
  const bamboo = new BambooClient({ subdomain: resolveBambooSubdomain() });

  const userInputs = scope.members
    .map((member) => member.workEmail.trim())
    .filter(Boolean);

  const teamUsers = await jira.resolveTeamUsersForAudit(userInputs);
  const teamIdentityIndex = buildTeamIdentityIndex(teamUsers, userInputs);

  const identityResolution: PerformanceIdentityResolution[] = scope.members.map(
    (member) => {
      const mapping = resolveJiraIdentity(member, teamUsers);
      const { identity } = toPersonJiraIdentity(mapping);
      const matched = identity.matchedBy !== "unresolved";
      if (!matched) {
        partialWarnings.push(
          `unresolved_jira_identity employeeId=${member.id} hasEmail=${Boolean(member.workEmail.trim())}`,
        );
        void writeLog(
          "warn",
          "app",
          "performance_identity",
          `Unresolved Jira identity for employeeId=${member.id} hasEmail=${Boolean(member.workEmail.trim())}`,
        );
      }
      return {
        employeeId: member.id,
        displayName: member.displayName,
        workEmail: member.workEmail,
        matched,
        matchedBy: identity.matchedBy,
        warnings: identity.warnings,
      };
    },
  );

  const bounds = dateRangeKeyToBounds(dateRangeKey);
  const params = normalizeReportParams({
    dateFrom: bounds.dateFrom,
    dateTo: bounds.dateTo,
    targetReviewDays: prefs.reportFilters.targetReviewDays,
    users: userInputs,
    projects: prefs.reportFilters.projects,
    teamScope: "direct",
  });

  const jql = buildJql(params);
  const issues = await jira.fetchAllIssues(jql);
  const issueKeys = issues.map(issueKeyFromRaw).filter(Boolean);
  const changelogByIssue = await jira.fetchAllChangelogsBatch(issueKeys);

  const reportData = await buildEnhancedJiraAuditReport({
    issues,
    params,
    teamUsers,
    teamIdentityIndex,
    changelogByIssue,
    fetchIssueByKey: (key) => jira.fetchIssueByKey(key),
    fetchChangelog: (key) => jira.fetchAllChangelog(key),
  });

  let timeOffEntries: TimeOffEntry[] = [];
  try {
    const range = getWhosOutDateRange();
    const raw = await bamboo.getWhosOut(range.start, range.end);
    timeOffEntries = raw as TimeOffEntry[];
  } catch {
    partialWarnings.push("bamboo_time_off_unavailable");
    void writeLog(
      "warn",
      "app",
      "performance_bamboo",
      "Could not refresh Bamboo time off.",
    );
  }

  const teamSnapshot = buildTeamSnapshot(
    org,
    reportData,
    timeOffEntries,
    prefs.workloadThresholds,
    teamUsers,
  );

  let kpiSnapshots = await loadKpiSnapshots();
  kpiSnapshots = recordDailySnapshots(
    kpiSnapshots,
    teamSnapshot,
    reportData,
  );
  await saveKpiSnapshots(kpiSnapshots);

  if (issues.length === 0) {
    partialWarnings.push("no_jira_issues_in_period");
  }

  return {
    teamSnapshot,
    reportData,
    kpiSnapshots,
    reportParams: reportData.params,
    identityResolution,
    timeOffEntries,
    partialWarnings,
    lastUpdatedAt: new Date().toISOString(),
  };
}
