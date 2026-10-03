import { formatDuration } from "../jira/dates";
import { buildKpiFromIssues } from "../jira/kpi";
import type { ReportParams } from "../jira/types";
import { isCompletionStatus } from "../periods/issueCompletion";
import type { CurrentUser } from "../types";
import { canOpenPersonDetail } from "../personAccess";
import type { Person, TeamSnapshot } from "../people/types";
import {
  classifyIssueAttention,
  formatStageAgeLabel,
  getActiveIssues,
} from "../radar/taskSignals";
import { classifyTaskHealth } from "../task-health/taskHealthEngine";
import type { WorkKnowledgeLink, WorkProject } from "../workGraph/workGraphTypes";
import { projectKeyFromIssueKey } from "../workGraph/issueProjectKey";
import { collectIssuesForScope } from "./collectProjectIssues";
import type {
  ProjectCockpitModel,
  ProjectCockpitScope,
  ProjectDeliverySignal,
  ProjectKnowledgeContext,
  ProjectKnowledgeGroup,
  ProjectWorkRow,
  WorkProjectSummary,
} from "./projectCockpitTypes";
import type { MetricCardData } from "../performance";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";
import { DEFAULT_OPERATIONAL_RULES } from "../operationalRules/operationalRulesDefaults";
import { taskHealthThresholdsFromRules } from "../operationalRules/normalizeOperationalRules";
import { comparisonPeriodLabel, type PerformanceDateRange } from "../performance/performanceDateRange";
import { formatAttentionHealthLabel } from "../../pages/performance/trendPresentation";
import { buildProjectDependencySection } from "../dependencies/buildProjectDependencies";
import type { DeliveryDependencyIndex } from "../dependencies/dependencyTypes";

export interface BuildProjectCockpitInput {
  scope: ProjectCockpitScope;
  snapshot: TeamSnapshot;
  params: ReportParams;
  displayRange?: PerformanceDateRange;
  projects: WorkProject[];
  knowledgeLinks: WorkKnowledgeLink[];
  knowledgeUnavailable?: boolean;
  currentUser: CurrentUser;
  jiraBaseUrl: string;
  operationalRules?: OperationalRules;
  dependencyIndex?: DeliveryDependencyIndex | null;
}

function findProjectMeta(
  projects: WorkProject[],
  projectKey: string,
  jiraBaseUrl: string,
): WorkProjectSummary {
  const key = projectKey.toUpperCase();
  const found = projects.find((p) => p.key.toUpperCase() === key);
  const jiraUrl =
    found?.jiraUrl ??
    `${jiraBaseUrl.replace(/\/+$/, "")}/projects/${encodeURIComponent(key)}`;
  return {
    projectKey: key,
    projectName: found?.name ?? `${key} project`,
    jiraUrl,
    linkedSpaceKey: found?.linkedSpaceKey ?? key,
    activeCount: 0,
    completedInPeriod: 0,
  };
}

function ownerForIssue(
  snapshot: TeamSnapshot,
  issueKey: string,
): Person | undefined {
  for (const person of snapshot.persons) {
    if (
      person.ownedIssues?.some((i) => i.issueKey === issueKey) ||
      person.issues?.some((i) => i.issueKey === issueKey)
    ) {
      return person;
    }
  }
  return undefined;
}

function buildKnowledge(
  projectKey: string,
  links: WorkKnowledgeLink[],
  unavailable: boolean,
  jiraBaseUrl: string,
): ProjectKnowledgeContext {
  if (unavailable) {
    return {
      groups: [],
      previewPages: [],
      totalCount: 0,
      unavailable: true,
    };
  }
  const related = links.filter(
    (link) =>
      link.projectKey?.toUpperCase() === projectKey.toUpperCase() ||
      link.issueKey?.startsWith(`${projectKey}-`),
  );
  const byId = new Map<string, WorkKnowledgeLink>();
  for (const link of related) {
    byId.set(link.page.id, link);
  }
  const unique = [...byId.values()];
  const highConfidence = unique.filter(
    (l) => l.confidence !== "contextual_search",
  );
  const preview = (highConfidence.length ? highConfidence : unique)
    .slice(0, 5)
    .map((l) => l.page);
  const groups: ProjectKnowledgeGroup[] = [];
  if (highConfidence.length) {
    groups.push({
      id: "linked",
      label: "Linked documentation",
      pages: highConfidence.map((l) => l.page).slice(0, 8),
    });
  }
  const suggested = unique.filter((l) => l.confidence === "contextual_search");
  if (suggested.length) {
    groups.push({
      id: "suggested",
      label: "Suggested documentation",
      pages: suggested.map((l) => l.page).slice(0, 5),
    });
  }
  const spaceUrl = `${jiraBaseUrl.replace(/\/+$/, "")}/wiki/spaces/${encodeURIComponent(projectKey)}`;
  return {
    groups,
    previewPages: preview,
    totalCount: unique.length,
    spaceUrl: related.length ? spaceUrl : undefined,
    unavailable: false,
  };
}

function buildDeliverySignals(
  issues: import("../jira/types").AuditIssue[],
  params: ReportParams,
  now: Date,
  rules: OperationalRules,
): ProjectDeliverySignal[] {
  const buckets = new Map<string, ProjectDeliverySignal>();
  for (const issue of issues) {
    const attention = classifyIssueAttention(issue, params, now, rules);
    if (!attention) continue;
    const id = attention.reason;
    const existing = buckets.get(id);
    if (existing) {
      existing.count += 1;
      if (!existing.issueKeys.includes(issue.issueKey)) {
        existing.issueKeys.push(issue.issueKey);
      }
      continue;
    }
    buckets.set(id, {
      id,
      label: attention.reason,
      count: 1,
      issueKeys: [issue.issueKey],
    });
  }
  return [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 6);
}

export function buildProjectCockpit(input: BuildProjectCockpitInput): ProjectCockpitModel {
  const rules = input.operationalRules ?? DEFAULT_OPERATIONAL_RULES;
  const healthThresholds = taskHealthThresholdsFromRules(rules);
  const now = new Date();
  const projectKey =
    input.scope.kind === "project"
      ? input.scope.projectKey.toUpperCase()
      : input.scope.projectKey?.toUpperCase() ??
        projectKeyFromIssueKey(input.scope.epicKey) ??
        "UNKNOWN";

  const issues = collectIssuesForScope(input.snapshot, input.scope);
  const kpi = buildKpiFromIssues(issues, {}, input.params);
  const firstPass =
    kpi.completedCount > 0
      ? Math.round((kpi.firstPassAcceptedCount / kpi.completedCount) * 100)
      : 0;

  const kpis: MetricCardData[] = [
    { label: "Completed", value: String(kpi.completedCount) },
    { label: "First pass", value: `${firstPass}%` },
    { label: "Backflows", value: String(kpi.backflowCount) },
    {
      label: "Avg cycle",
      value: kpi.avgProgressToReviewMs
        ? formatDuration(kpi.avgProgressToReviewMs)
        : "—",
    },
  ];

  const identity = findProjectMeta(
    input.projects,
    projectKey,
    input.jiraBaseUrl,
  );
  identity.completedInPeriod = kpi.completedCount;

  const workRows: ProjectWorkRow[] = [];
  let active = 0;
  let inReview = 0;
  let problematic = 0;
  let inProgress = 0;
  let noActivity = 0;

  const activeIssueKeys = new Set<string>();
  for (const person of input.snapshot.persons) {
    for (const issue of getActiveIssues(person, input.params)) {
      if (issues.every((i) => i.issueKey !== issue.issueKey)) continue;
      activeIssueKeys.add(issue.issueKey);
    }
  }

  for (const issue of issues) {
    const status = issue.currentStatus || "—";
    const completed = isCompletionStatus(status);
    const owner = ownerForIssue(input.snapshot, issue.issueKey);
    const attention = classifyIssueAttention(issue, input.params, now, rules);
    const health = classifyTaskHealth({
      issue,
      params: input.params,
      now,
      thresholds: healthThresholds,
    });
    const row: ProjectWorkRow = {
      issueKey: issue.issueKey,
      title: issue.issueSummary,
      status,
      ownerName:
        owner?.bamboo.displayName ??
        issue.currentAssigneeDisplayName ??
        issue.assigneeName ??
        "Unassigned",
      personId: owner?.id,
      canOpenPerson: owner
        ? canOpenPersonDetail(input.currentUser, owner.id)
        : false,
      stageAge: formatStageAgeLabel(issue, now),
      attentionLabel: attention
        ? formatAttentionHealthLabel(health.status)
        : undefined,
      isCompleted: completed,
    };
    workRows.push(row);

    if (!completed && activeIssueKeys.has(issue.issueKey)) {
      active += 1;
      if (/review/i.test(status)) inReview += 1;
      if (/progress/i.test(status)) inProgress += 1;
      if (health.status === "problematic") problematic += 1;
      if (health.status === "no_activity") noActivity += 1;
    }
  }

  identity.activeCount = active;

  const peopleMap = new Map<string, ProjectCockpitModel["people"][number]>();
  for (const row of workRows) {
    if (row.isCompleted || !activeIssueKeys.has(row.issueKey)) continue;
    const key = row.personId ?? row.ownerName;
    const existing = peopleMap.get(key);
    const inRev = /review/i.test(row.status) ? 1 : 0;
    if (existing) {
      existing.activeCount += 1;
      existing.inReviewCount += inRev;
      continue;
    }
    const person = row.personId
      ? input.snapshot.persons.find((p) => p.id === row.personId)
      : undefined;
    let availabilityNote: string | undefined;
    if (person) {
      const avail = person.availability;
      if (
        avail.state === "vacation_soon" ||
        avail.state === "vacation_tomorrow"
      ) {
        availabilityNote = avail.label;
      }
    }
    peopleMap.set(key, {
      personId: row.personId,
      displayName: row.ownerName,
      canOpenPerson: row.canOpenPerson,
      activeCount: 1,
      inReviewCount: inRev,
      availabilityNote,
    });
  }

  const people = [...peopleMap.values()].sort(
    (a, b) => b.activeCount - a.activeCount,
  );
  const maxOwned = people.reduce((max, p) => Math.max(max, p.activeCount), 0);
  const awayNext = people.filter((p) => p.availabilityNote).length;
  const awayActive = people
    .filter((p) => p.availabilityNote)
    .reduce((sum, p) => sum + p.activeCount, 0);

  const initiative =
    input.scope.kind === "epic"
      ? {
          epicKey: input.scope.epicKey,
          summary:
            issues.find(
              (i) =>
                input.scope.kind === "epic" && i.epicKey === input.scope.epicKey,
            )?.epicSummary ??
            (input.scope.kind === "epic" ? input.scope.epicKey : ""),
          projectKey,
        }
      : undefined;

  return {
    scope: input.scope,
    identity,
    initiative,
    periodLabel: input.displayRange
      ? comparisonPeriodLabel(input.displayRange)
      : "Selected period",
    summary: {
      active,
      inReview,
      completedInPeriod: kpi.completedCount,
      problematic,
    },
    deliveryFlow: {
      inProgress,
      inReview,
      problematic,
      noActivity,
      backflow: kpi.backflowCount,
    },
    deliverySignals: buildDeliverySignals(
      issues.filter((i) => activeIssueKeys.has(i.issueKey)),
      input.params,
      now,
      rules,
    ),
    kpis,
    workRows: workRows
      .filter((r) => !r.isCompleted || kpi.completedCount > 0)
      .sort((a, b) => a.issueKey.localeCompare(b.issueKey)),
    people,
    distribution: {
      totalActive: active,
      contributorCount: people.length,
      maxActiveOwnedByOne: maxOwned,
    },
    capacityNote:
      awayNext > 0
        ? `${awayNext} contributor${awayNext === 1 ? "" : "s"} with upcoming leave · ${awayActive} active project tasks`
        : undefined,
    knowledge: buildKnowledge(
      projectKey,
      input.knowledgeLinks,
      input.knowledgeUnavailable ?? false,
      input.jiraBaseUrl,
    ),
    dependencies: buildProjectDependencySection(
      projectKey,
      input.dependencyIndex,
    ),
  };
}

export function filterProjectWorkRows(
  rows: ProjectWorkRow[],
  filter: import("./projectCockpitTypes").ProjectWorkFilter,
): ProjectWorkRow[] {
  switch (filter) {
    case "attention":
      return rows.filter((row) => Boolean(row.attentionLabel) && !row.isCompleted);
    case "in_progress":
      return rows.filter(
        (row) => /progress/i.test(row.status) && !row.isCompleted,
      );
    case "in_review":
      return rows.filter(
        (row) => /review/i.test(row.status) && !row.isCompleted,
      );
    case "completed":
      return rows.filter((row) => row.isCompleted);
    default:
      return rows.filter((row) => !row.isCompleted);
  }
}
