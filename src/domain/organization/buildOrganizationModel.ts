import { formatDuration } from "../jira/dates";
import { getEfficiencyStatus } from "../jira/kpi";
import type { KpiData } from "../jira/types";
import type { Person } from "../people/types";
import type { ReportParams } from "../jira/types";
import type { MetricCardData } from "../performance";
import type { DeliveryRiskItem } from "../radar/types";
import type { FeedbackActionSummary } from "../feedback/feedbackActionSummary";
import { buildDeliveryRiskItems } from "../radar/deliveryRisk";
import type { TeamSnapshot } from "../people/types";
import type { AuthorizedPeopleScope } from "./authorizedPeopleScope";
import {
  buildOrganizationSignals,
  newStarterAggregate,
} from "./buildOrganizationSignals";
import { groupPersonsByTeam, type TeamGroup } from "./teamGrouping";
import {
  buildLeadershipBranchRow,
  groupPersonsByLeadershipBranch,
} from "./leadershipBranches";
import { buildLeadershipBranches } from "./leadershipBranchAggregation";
import { buildOrgGraph } from "./orgGraph";
import type { OrgHierarchyScope } from "./orgRole";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { buildDirectorTeamCapacity } from "../availability/teamAvailabilityContext";
import type {
  OrganizationOverviewModel,
  OrganizationTeamRow,
  OrganizationTeamTrend,
} from "./organizationTypes";

function aggregateKpi(persons: Person[]): KpiData {
  const totals = {
    startedCount: 0,
    completedCount: 0,
    firstPassAcceptedCount: 0,
    backflowCount: 0,
    avgProgressToReviewMs: null as number | null,
    efficiencyIndex: 0,
  };
  const cycleSamples: number[] = [];

  for (const person of persons) {
    const kpi = person.performance;
    if (!kpi) continue;
    totals.startedCount += kpi.startedCount;
    totals.completedCount += kpi.completedCount;
    totals.firstPassAcceptedCount += kpi.firstPassAcceptedCount;
    totals.backflowCount += kpi.backflowCount;
    if (kpi.avgProgressToReviewMs != null) {
      cycleSamples.push(kpi.avgProgressToReviewMs);
    }
  }

  if (cycleSamples.length) {
    totals.avgProgressToReviewMs = Math.round(
      cycleSamples.reduce((a, b) => a + b, 0) / cycleSamples.length,
    );
  }

  const completionRate =
    totals.startedCount > 0 ? totals.completedCount / totals.startedCount : 0;
  const firstPassRate =
    totals.completedCount > 0
      ? totals.firstPassAcceptedCount / totals.completedCount
      : 0;
  totals.efficiencyIndex = Math.round(
    (completionRate * 0.4 + firstPassRate * 0.4) * 100 -
      Math.min(totals.backflowCount * 3, 20),
  );

  return totals as KpiData;
}

function buildTeamRow(team: TeamGroup, deliveryRisk: DeliveryRiskItem[]): OrganizationTeamRow {
  const kpi = aggregateKpi(team.persons);
  const firstPassPercent =
    kpi.completedCount > 0
      ? Math.round((kpi.firstPassAcceptedCount / kpi.completedCount) * 100)
      : 0;
  const teamRisk = deliveryRisk.filter((item) =>
    team.persons.some((person) => person.id === item.personId),
  );
  const attentionSeverity = teamRisk.some((r) => r.severity === "critical")
    ? 0
    : teamRisk.some((r) => r.severity === "warning")
      ? 1
      : 2;
  const upcomingLeave = team.persons.filter(
    (p) =>
      p.availability.state === "vacation_soon" ||
      p.availability.state === "vacation_tomorrow",
  ).length;
  const activeWork = team.persons.reduce(
    (sum, person) => sum + (person.workload?.activeCount ?? 0),
    0,
  );

  return {
    teamId: team.teamId,
    teamName: team.teamName,
    peopleCount: team.persons.length,
    activeWork,
    attentionCount: teamRisk.length,
    completed: kpi.completedCount,
    firstPassPercent,
    avgCycleLabel: kpi.avgProgressToReviewMs
      ? formatDuration(kpi.avgProgressToReviewMs)
      : "—",
    upcomingLeave,
    attentionSeverity,
  };
}

function scopeLabel(scope: AuthorizedPeopleScope): string {
  if (scope.mode === "organization") {
    return `Organization scope · ${scope.personIds.length} people`;
  }
  if (scope.mode === "direct_reports") {
    return `Authorized scope · ${scope.personIds.length} people (direct reports)`;
  }
  return "Personal scope";
}

function buildSummaryMetrics(persons: Person[]): MetricCardData[] {
  const kpi = aggregateKpi(persons);
  const firstPassRate =
    kpi.completedCount > 0
      ? Math.round((kpi.firstPassAcceptedCount / kpi.completedCount) * 100)
      : 0;
  return [
    {
      label: "Efficiency",
      value: `${kpi.efficiencyIndex}%`,
      status: getEfficiencyStatus(kpi.efficiencyIndex),
      statusVariant:
        kpi.efficiencyIndex >= 75
          ? "success"
          : kpi.efficiencyIndex >= 55
            ? "warning"
            : "danger",
    },
    {
      label: "First pass",
      value: `${firstPassRate}%`,
    },
    {
      label: "Completed",
      value: String(kpi.completedCount),
    },
    {
      label: "Backflows",
      value: String(kpi.backflowCount),
    },
  ];
}

function buildTeamTrends(teams: TeamGroup[]): OrganizationTeamTrend[] {
  return teams.map((team) => {
    const kpi = aggregateKpi(team.persons);
    if (kpi.completedCount < 3) {
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        label: "Not enough history",
        insufficientHistory: true,
      };
    }
    const backflowNote =
      kpi.backflowCount >= 3 ? "Rework elevated" : "Delivery stable";
    const cycleNote = kpi.avgProgressToReviewMs
      ? `Avg cycle ${formatDuration(kpi.avgProgressToReviewMs)}`
      : "Cycle data limited";
    return {
      teamId: team.teamId,
      teamName: team.teamName,
      label: `${backflowNote} · ${cycleNote}`,
    };
  });
}

export function buildOrganizationModel(input: {
  snapshot: TeamSnapshot;
  params: ReportParams;
  scope: AuthorizedPeopleScope;
  feedback: FeedbackActionSummary;
  orgHierarchy?: OrgHierarchyScope | null;
  bambooRoster?: ResolvedEmployee[];
}): OrganizationOverviewModel {
  const persons = input.snapshot.persons.filter((person) =>
    input.scope.personIds.includes(person.id),
  );
  const deliveryRisk = buildDeliveryRiskItems(
    { ...input.snapshot, persons },
    input.params,
  );
  const useLeadershipBranches =
    input.orgHierarchy?.role === "manager_of_managers" &&
    input.orgHierarchy.topLevelManagerBranches.length > 0;

  const teams: TeamGroup[] = useLeadershipBranches
    ? groupPersonsByLeadershipBranch({
        branches: input.orgHierarchy!.topLevelManagerBranches,
        roster: input.bambooRoster ?? [],
        snapshotPersons: persons,
      }).map((branch) => ({
        teamId: branch.branchId,
        teamName: branch.leaderName,
        persons: branch.persons,
      }))
    : groupPersonsByTeam(persons);

  const teamRows = useLeadershipBranches
    ? groupPersonsByLeadershipBranch({
        branches: input.orgHierarchy!.topLevelManagerBranches,
        roster: input.bambooRoster ?? [],
        snapshotPersons: persons,
      }).map((branch) =>
        buildLeadershipBranchRow(branch, deliveryRisk),
      )
    : teams.map((team) => buildTeamRow(team, deliveryRisk));
  const teamsNeedingAttention = [...teamRows]
    .filter((row) => row.attentionCount > 0)
    .sort((a, b) => a.attentionSeverity - b.attentionSeverity || b.attentionCount - a.attentionCount);

  const signals = buildOrganizationSignals({
    teams,
    deliveryRisk,
    feedback: input.feedback,
  });

  const teamCapacity = buildDirectorTeamCapacity(
    teams.map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      persons: team.persons,
    })),
  );

  const leadershipBranches =
    useLeadershipBranches && input.orgHierarchy
      ? buildLeadershipBranches({
          branches: input.orgHierarchy.topLevelManagerBranches,
          roster: input.bambooRoster ?? [],
          persons,
          deliveryRisk,
          graph: buildOrgGraph(input.bambooRoster ?? []),
        })
      : undefined;

  return {
    scope: input.scope,
    scopeLabel: scopeLabel(input.scope),
    summary: buildSummaryMetrics(persons),
    teamTrends: buildTeamTrends(teams),
    teamsNeedingAttention,
    signals,
    teams: teamRows.sort((a, b) => a.teamName.localeCompare(b.teamName)),
    deliveryRisk,
    teamCapacity,
    leadershipBranches,
    newStarterSummary: newStarterAggregate(persons),
    feedbackSummary: {
      pendingRecipients: input.feedback.pendingResponseCount,
      deliveryFailures: input.feedback.deliveryFailureCount,
      preparedNotSent: input.feedback.preparedNotSent,
    },
  };
}

export function filterDeliveryRiskForTeam(
  items: DeliveryRiskItem[],
  teamPersonIds: Set<string>,
  filter?: "review" | "all",
): DeliveryRiskItem[] {
  let rows = items.filter((item) => teamPersonIds.has(item.personId));
  if (filter === "review") {
    rows = rows.filter((item) => /review/i.test(item.status));
  }
  return rows;
}
