import { resolveBambooSubdomain, resolveJiraBaseUrl } from "../../config/product";
import { buildJql, normalizeReportParams } from "../../domain/jira/jql";
import { buildEnhancedJiraAuditReport } from "../../domain/jira/report";
import { buildTeamIdentityIndex } from "../../domain/jira/users";
import type { TimeOffEntry } from "../../domain/people/availability";
import type { DateRangeKey, PerformanceReviewTarget } from "../../domain/performance";
import type { PerformanceAudience } from "../../domain/performance/reportParams";
import {
  resolvePerformanceReportRanges,
} from "../../domain/performance/reportParams";
import {
  buildScopeKeyFromSnapshot,
  needsHistoricalBootstrap,
  runHistoricalBootstrap,
} from "../history/historicalBootstrap";
import type { ResolvedEmployee } from "../bamboo/orgResolver";
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

function membersForJiraScope(
  teamDetection: OrgResolutionResult,
  scopedOrg: OrgResolutionResult,
  teamScope: "direct" | "full",
): ResolvedEmployee[] {
  const scope = resolveTeamScope(scopedOrg);
  if (!scope) {
    return [];
  }
  if (teamScope === "full" && teamDetection.fullTeam.length > 0) {
    const seen = new Set<string>();
    const members: ResolvedEmployee[] = [];
    const seed = teamDetection.employee
      ? [teamDetection.employee, ...teamDetection.fullTeam]
      : teamDetection.fullTeam;
    for (const member of seed) {
      if (seen.has(member.id)) continue;
      seen.add(member.id);
      members.push(member);
    }
    return members;
  }
  return scope.members;
}

export async function fetchPerformanceData(
  dateRangeKey: DateRangeKey,
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
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

  const reportRanges = resolvePerformanceReportRanges(
    dateRangeKey,
    reviewTarget,
    audience,
  );

  const workEmail = getWorkEmail(prefs);
  const jira = new JiraClient({
    baseUrl: resolveJiraBaseUrl(),
    email: workEmail,
  });
  const bamboo = new BambooClient({ subdomain: resolveBambooSubdomain() });

  const scopeMembers = membersForJiraScope(
    prefs.teamDetection,
    org,
    reportRanges.teamScope,
  );
  const userInputs = scopeMembers
    .map((member) => member.workEmail.trim())
    .filter(Boolean);

  const teamUsers = await jira.resolveTeamUsersForAudit(userInputs);
  const teamIdentityIndex = buildTeamIdentityIndex(teamUsers, userInputs);

  const identityResolution: PerformanceIdentityResolution[] = scopeMembers.map(
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

  const fetchParams = normalizeReportParams({
    dateFrom: reportRanges.fetchDateFrom,
    dateTo: reportRanges.fetchDateTo,
    targetReviewDays: prefs.reportFilters.targetReviewDays,
    users: userInputs,
    projects: prefs.reportFilters.projects,
    teamScope: reportRanges.teamScope,
  });

  const displayParams = normalizeReportParams({
    dateFrom: reportRanges.displayDateFrom,
    dateTo: reportRanges.displayDateTo,
    targetReviewDays: prefs.reportFilters.targetReviewDays,
    users: userInputs,
    projects: prefs.reportFilters.projects,
    teamScope: reportRanges.teamScope,
  });

  const jql = buildJql(fetchParams);
  const issues = await jira.fetchAllIssues(jql);
  const issueKeys = issues.map(issueKeyFromRaw).filter(Boolean);
  const changelogByIssue = await jira.fetchAllChangelogsBatch(issueKeys);

  const historyReportData = await buildEnhancedJiraAuditReport({
    issues,
    params: fetchParams,
    teamUsers,
    teamIdentityIndex,
    changelogByIssue,
    fetchIssueByKey: (key) => jira.fetchIssueByKey(key),
    fetchChangelog: (key) => jira.fetchAllChangelog(key),
  });

  const reportData = await buildEnhancedJiraAuditReport({
    issues,
    params: displayParams,
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

  const historyTeamSnapshot = buildTeamSnapshot(
    org,
    historyReportData,
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

  let historicalBootstrapRan = false;
  const scopeKey = buildScopeKeyFromSnapshot(
    historyTeamSnapshot,
    historyReportData,
  );
  if (needsHistoricalBootstrap(kpiSnapshots, scopeKey)) {
    kpiSnapshots = runHistoricalBootstrap(
      kpiSnapshots,
      historyTeamSnapshot,
      historyReportData,
    );
    historicalBootstrapRan = true;
  }

  await saveKpiSnapshots(kpiSnapshots);

  if (issues.length === 0) {
    partialWarnings.push("no_jira_issues_in_period");
  }

  return {
    teamSnapshot,
    historyTeamSnapshot,
    reportData,
    historyReportData,
    kpiSnapshots,
    reportParams: reportData.params,
    reportRanges,
    identityResolution,
    timeOffEntries,
    partialWarnings,
    lastUpdatedAt: new Date().toISOString(),
    historicalBootstrapRan,
  };
}
