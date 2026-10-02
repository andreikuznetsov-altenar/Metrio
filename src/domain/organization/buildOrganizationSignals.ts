import { isNewStarter } from "../onboarding/newStarter";
import type { DeliveryRiskItem } from "../radar/types";
import type { Person } from "../people/types";
import type { FeedbackActionSummary } from "../feedback/feedbackActionSummary";
import type { TeamGroup } from "./teamGrouping";
import { teamKeyForPerson, teamNameForPerson } from "./teamGrouping";
import type { OrganizationSignal, OrganizationSignalKind } from "./organizationTypes";

const REVIEW_BOTTLENECK_MIN = 5;
const DELIVERY_RISK_TEAM_MIN = 4;
const FEEDBACK_PENDING_MIN = 3;
const NEW_STARTER_TEAM_MIN = 2;
const LEAVE_CAPACITY_PEOPLE_MIN = 2;
const LEAVE_CAPACITY_ACTIVE_MIN = 10;

function signalId(teamId: string | undefined, kind: OrganizationSignalKind): string {
  return `${teamId ?? "org"}:${kind}`;
}

export function buildOrganizationSignals(input: {
  teams: TeamGroup[];
  deliveryRisk: DeliveryRiskItem[];
  feedback: FeedbackActionSummary;
}): OrganizationSignal[] {
  const signals: OrganizationSignal[] = [];

  for (const team of input.teams) {
    const teamDelivery = input.deliveryRisk.filter((item) =>
      team.persons.some((person) => person.id === item.personId),
    );

    const reviewCount = teamDelivery.filter((item) =>
      /review/i.test(item.status),
    ).length;
    if (reviewCount >= REVIEW_BOTTLENECK_MIN) {
      signals.push({
        id: signalId(team.teamId, "review_bottleneck"),
        teamId: team.teamId,
        teamName: team.teamName,
        kind: "review_bottleneck",
        severity: "warning",
        title: "Review bottleneck",
        description: `${team.teamName} · ${reviewCount} tasks in Review`,
        metricContext: `${reviewCount} tasks`,
        target: {
          kind: "director-delivery",
          teamId: team.teamId,
          filter: "review",
        },
      });
    }

    if (teamDelivery.length >= DELIVERY_RISK_TEAM_MIN) {
      signals.push({
        id: signalId(team.teamId, "delivery_risk_concentration"),
        teamId: team.teamId,
        teamName: team.teamName,
        kind: "delivery_risk_concentration",
        severity: "warning",
        title: "Delivery risk concentration",
        description: `${team.teamName} · ${teamDelivery.length} tasks need attention`,
        target: {
          kind: "director-delivery",
          teamId: team.teamId,
          filter: "all",
        },
      });
    }

    const heavy = team.persons.filter((person) => {
      const level = person.workload?.level;
      return level === "high" || level === "overloaded";
    });
    const threshold = team.persons.length >= 4 ? 3 : 2;
    if (heavy.length >= threshold) {
      signals.push({
        id: signalId(team.teamId, "workload_concentration"),
        teamId: team.teamId,
        teamName: team.teamName,
        kind: "workload_concentration",
        severity: "warning",
        title: "Workload concentration",
        description: `${heavy.length} of ${team.persons.length} members are Heavy / Overloaded`,
        target: { kind: "director-teams", teamId: team.teamId },
      });
    }

    const leaveSoon = team.persons.filter(
      (person) =>
        person.availability.state === "vacation_soon" ||
        person.availability.state === "vacation_tomorrow",
    );
    const activeWork = team.persons.reduce(
      (sum, person) => sum + (person.workload?.activeCount ?? 0),
      0,
    );
    if (
      leaveSoon.length >= LEAVE_CAPACITY_PEOPLE_MIN &&
      activeWork >= LEAVE_CAPACITY_ACTIVE_MIN
    ) {
      signals.push({
        id: signalId(team.teamId, "leave_capacity"),
        teamId: team.teamId,
        teamName: team.teamName,
        kind: "leave_capacity",
        severity: "warning",
        title: "Capacity reduction",
        description: `${team.teamName} · ${leaveSoon.length} people away soon · ${activeWork} active tasks`,
        target: { kind: "director-teams", teamId: team.teamId },
      });
    }

    const starters = team.persons.filter((person) =>
      isNewStarter(person.bamboo.hireDate),
    );
    if (starters.length >= NEW_STARTER_TEAM_MIN) {
      signals.push({
        id: signalId(team.teamId, "new_starter_capacity"),
        teamId: team.teamId,
        teamName: team.teamName,
        kind: "new_starter_capacity",
        severity: "info",
        title: "New starters",
        description: `${starters.length} new starters in ${team.teamName}`,
        target: { kind: "director-new-starters", teamId: team.teamId },
      });
    }
  }

  if (input.feedback.pendingResponseCount >= FEEDBACK_PENDING_MIN) {
    signals.push({
      id: signalId(undefined, "feedback_pending"),
      kind: "feedback_pending",
      severity: "info",
      title: "Feedback responses pending",
      description: `${input.feedback.pendingResponseCount} recipients have not responded`,
      target: { kind: "feedback", tab: "delivery" },
    });
  }

  return dedupeSignals(signals);
}

function dedupeSignals(signals: OrganizationSignal[]): OrganizationSignal[] {
  const map = new Map<string, OrganizationSignal>();
  for (const signal of signals) {
    map.set(signal.id, signal);
  }
  const severityRank = { danger: 0, warning: 1, info: 2 };
  return [...map.values()].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
}

export function newStarterAggregate(persons: Person[]): {
  total: number;
  byTeam: { teamId: string; teamName: string; count: number }[];
} {
  const starters = persons.filter((person) => isNewStarter(person.bamboo.hireDate));
  const byTeam = new Map<string, { teamId: string; teamName: string; count: number }>();
  for (const person of starters) {
    const teamId = teamKeyForPerson(person);
    const teamName = teamNameForPerson(person);
    const row = byTeam.get(teamId) ?? { teamId, teamName, count: 0 };
    row.count += 1;
    byTeam.set(teamId, row);
  }
  return {
    total: starters.length,
    byTeam: [...byTeam.values()],
  };
}
