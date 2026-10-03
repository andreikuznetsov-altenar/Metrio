import { buildEmployeeFocusActions } from "../actions/buildEmployeeFocus";
import { buildTeamActions } from "../actions/buildTeamActions";
import { buildDirectorTeamActions } from "../actions/buildOrganizationActions";
import type { PersonAnalyticsWorkspace } from "../analytics/personAnalyticsWorkspace";
import { buildPreLeaveWorkSummary } from "../availability/preLeaveWork";
import { buildManagerAvailabilityRows } from "../availability/teamAvailabilityContext";
import {
  availabilityHeadline,
  calendarDaysUntil,
  isUpcomingLeaveState,
} from "../availability/leaveCalendar";
import { summarizeFeedbackActions } from "../feedback/feedbackActionSummary";
import type { JiraAssignmentState } from "../jira/jiraAssignmentTracking";
import { unreadJiraAssignments } from "../jira/jiraAssignmentTracking";
import {
  formatNewStarterHeadline,
  isNewStarter,
  newStarterDayNumber,
} from "../onboarding/newStarter";
import { matchOnboardingResources } from "../onboarding/matchOnboardingResources";
import type {
  DeliveryRiskRow,
  EmployeePerformanceSnapshot,
  TeamPerformanceSnapshot,
} from "../performance";
import { buildHomeProjectSignals } from "../projectCockpit/buildHomeProjectSignals";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";
import { DEFAULT_OPERATIONAL_RULES } from "../operationalRules/operationalRulesDefaults";
import type { OrganizationOverviewModel } from "../organization/organizationTypes";
import type { Person } from "../people/types";
import type { UserRole } from "../types";
import type { SurveyDataFile } from "../survey/types";
import type { OnboardingChecklistModel } from "../onboardingChecklist/onboardingChecklistTypes";
import type { ManagerOnboardingProgressRow } from "../onboardingChecklist/onboardingChecklistTypes";
import type {
  HomeDeliverySummary,
  HomeFeedbackCard,
  HomeKnowledgeItem,
  HomeOrganizationWorkspace,
  HomePersonalWorkspace,
  HomeRoleVariant,
  HomeTeamWorkspace,
  HomeWorkspace,
} from "./homeTypes";
import type { WorkKnowledgeLink } from "../workGraph/workGraphTypes";
import type { DeliveryDependencyIndex } from "../dependencies/dependencyTypes";
import { buildHomeDependencySignals } from "../dependencies/buildHomeDependencySignals";

export interface BuildHomeWorkspaceInput {
  role: UserRole;
  homeRole: HomeRoleVariant;
  selfPerson: Person;
  selfPersonId: string;
  workspace: PersonAnalyticsWorkspace | null;
  employeeSnapshot: EmployeePerformanceSnapshot | null;
  teamSnapshot: TeamPerformanceSnapshot | null;
  deliveryRisk: DeliveryRiskRow[];
  assignmentState: JiraAssignmentState;
  surveyData: SurveyDataFile | null | undefined;
  organizationModel: OrganizationOverviewModel | null;
  knowledgeLinks: WorkKnowledgeLink[];
  knowledgeStatus: HomePersonalWorkspace["knowledgeStatus"];
  reportParams: import("../jira/types").ReportParams | undefined;
  teamPersons: Person[];
  selfDisplayName: string;
  now?: Date;
  operationalRules?: OperationalRules;
  personalOnboarding?: OnboardingChecklistModel | null;
  teamOnboardingProgress?: Record<string, ManagerOnboardingProgressRow>;
  dependencyIndex?: DeliveryDependencyIndex | null;
}

export function resolveHomeRoleVariant(
  role: UserRole,
  organizationModel: OrganizationOverviewModel | null,
): HomeRoleVariant {
  if (role === "director" && organizationModel?.scope.mode === "organization") {
    return "director";
  }
  if (role === "lead" || role === "director") {
    return "manager";
  }
  return "employee";
}

export function buildHomeWorkspace(input: BuildHomeWorkspaceInput): HomeWorkspace {
  const now = input.now ?? new Date();
  const personal = buildPersonalSection(input, now);
  const team =
    input.homeRole !== "employee" && input.teamSnapshot
      ? buildTeamSection(input, now)
      : undefined;
  const organization =
    input.homeRole === "director" && input.organizationModel
      ? buildOrganizationSection(input.organizationModel)
      : undefined;

  const unread = unreadJiraAssignments(input.assignmentState);
  const active =
    input.employeeSnapshot?.myWeek.summary.find((m) => m.label === "Active")
      ?.value ?? "0";
  const vacationPart = vacationContextLine(input.selfPerson, now);

  const contextParts: string[] = [];
  if (unread.length > 0) {
    contextParts.push(
      `${unread.length} new task${unread.length === 1 ? "" : "s"}`,
    );
  }
  contextParts.push(`${active} active`);
  if (vacationPart) contextParts.push(vacationPart);

  const greetingName = input.selfDisplayName.split(" ")[0] || input.selfDisplayName;

  return {
    role: input.homeRole,
    greeting: `${greetingForHour(now)}, ${greetingName}`,
    contextLine: contextParts.join(" · "),
    personal,
    team,
    organization,
  };
}

function buildPersonalSection(
  input: BuildHomeWorkspaceInput,
  now: Date,
): HomePersonalWorkspace {
  const { selfPerson, workspace, employeeSnapshot, assignmentState } = input;
  const focus =
    workspace && employeeSnapshot
      ? buildEmployeeFocusActions({
          workspace,
          myWeek: employeeSnapshot.myWeek,
          selfPersonId: input.selfPersonId,
        })
      : [];

  const newAssignments = unreadJiraAssignments(assignmentState).slice(0, 3);

  let newStarter: HomePersonalWorkspace["newStarter"];
  const hireDate = selfPerson.bamboo.hireDate;
  if (hireDate && isNewStarter(hireDate, now)) {
    const matched = matchOnboardingResources(
      {
        department: selfPerson.bamboo.department,
        jobTitle: selfPerson.bamboo.jobTitle,
        projects: [],
        confluenceLinks: [],
      },
      "https://jira.atlassian.net",
    );
    newStarter = {
      headline: formatNewStarterHeadline(hireDate, now),
      resourceCount: matched.preview.length,
      bambooActionCount: matched.all.filter((r) => r.source === "bamboo").length,
      checklistProgress: input.personalOnboarding?.progress.headline,
      checklistNextTitles: input.personalOnboarding?.progress.nextItems.map(
        (i) => i.title,
      ),
    };
  }

  let timeOff: HomePersonalWorkspace["timeOff"];
  if (
    employeeSnapshot?.timeOff &&
    isUpcomingLeaveState(selfPerson.availability.state)
  ) {
    const preLeave =
      input.reportParams
        ? buildPreLeaveWorkSummary(selfPerson, input.reportParams, 5, now)
        : null;
    timeOff = {
      headline:
        employeeSnapshot.timeOff.headline ||
        availabilityHeadline(selfPerson.availability, now),
      rangeLabel: employeeSnapshot.timeOff.rangeLabel,
      activeCount: preLeave?.activeCount ?? 0,
      inReviewCount: preLeave?.inReviewCount ?? 0,
    };
  }

  const metrics = employeeSnapshot?.metrics ?? workspace?.performanceKpis ?? [];
  const pick = ["Efficiency", "First pass", "Completed"];
  const performanceSnapshot = {
    metrics: pick
      .map((label) => metrics.find((m) => m.label === label))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({ label: m.label, value: m.value })),
  };

  return {
    focus,
    newAssignments,
    newStarter,
    timeOff,
    knowledge: mapKnowledge(input.knowledgeLinks),
    knowledgeStatus: input.knowledgeStatus,
    performanceSnapshot,
  };
}

function buildTeamSection(
  input: BuildHomeWorkspaceInput,
  now: Date,
): HomeTeamWorkspace {
  const snapshot = input.teamSnapshot!;
  const feedbackSummary = summarizeFeedbackActions(input.surveyData);
  const rules = input.operationalRules ?? DEFAULT_OPERATIONAL_RULES;
  const actionsInput = {
    snapshot,
    deliveryRisk: input.deliveryRisk,
    dependencyIndex: input.dependencyIndex,
    feedback: feedbackSummary,
    now,
    operationalRules: rules,
  };
  const actions =
    input.role === "director"
      ? buildDirectorTeamActions(actionsInput).slice(0, 5)
      : buildTeamActions(actionsInput).slice(0, 5);

  const availabilityRows = buildManagerAvailabilityRows(
    snapshot,
    input.deliveryRisk,
    now,
  );
  const awayNextWeek = availabilityRows.filter(
    (row) => row.daysUntil != null && row.daysUntil >= 0 && row.daysUntil <= 7,
  ).length;

  const newStarters: HomeTeamWorkspace["newStarters"] = [];
  const directReportIds = new Set(snapshot.directReportIds);
  for (const person of input.teamPersons) {
    if (!directReportIds.has(person.id)) continue;
    const hireDate = person.bamboo.hireDate;
    if (!hireDate || !isNewStarter(hireDate, now)) continue;
    const onboardingRow = input.teamOnboardingProgress?.[person.id];
    newStarters.push({
      personId: person.id,
      personName: person.bamboo.displayName,
      dayLabel: `Day ${newStarterDayNumber(hireDate, now)}`,
      progressLabel: onboardingRow?.progressLabel,
      remainingTitles: onboardingRow?.remainingTitles,
    });
  }

  return {
    actions,
    deliverySummary: summarizeDelivery(input.deliveryRisk, rules),
    projectSignals: buildHomeProjectSignals(input.deliveryRisk, rules),
    awayNextWeek,
    availabilityPreview: availabilityRows.slice(0, 3),
    newStarters,
    feedback: buildFeedbackCard(input.surveyData, feedbackSummary),
    dependencySignals: buildHomeDependencySignals(input.dependencyIndex),
  };
}

function buildOrganizationSection(
  model: OrganizationOverviewModel,
): HomeOrganizationWorkspace {
  return {
    model,
    signalCount: model.signals.length,
    teamsNeedingAttention: model.teamsNeedingAttention.length,
  };
}

function summarizeDelivery(
  deliveryRisk: DeliveryRiskRow[],
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): HomeDeliverySummary {
  let problematic = 0;
  let longReview = 0;
  let backflowSignals = 0;
  const longReviewDays = rules.taskAttention.longReviewHighlightDays;
  for (const row of deliveryRisk) {
    if (/problematic|at risk/i.test(row.riskReason)) {
      problematic += 1;
    }
    if (
      /review/i.test(row.status) &&
      parseStageDays(row.age) >= longReviewDays
    ) {
      longReview += 1;
    }
    if (/backflow/i.test(row.riskReason)) {
      backflowSignals += 1;
    }
  }
  return { problematic, longReview, backflowSignals };
}

function parseStageDays(age: string): number {
  const match = age.match(/(\d+)\s*day/i);
  return match ? Number(match[1]) : 0;
}

function buildFeedbackCard(
  surveyData: SurveyDataFile | null | undefined,
  summary: ReturnType<typeof summarizeFeedbackActions>,
): HomeFeedbackCard | null {
  const parts: string[] = [];
  const latest = surveyData?.surveys?.[surveyData.surveys.length - 1];
  if (latest && (latest.status === "active" || latest.status === "sending")) {
    const responded = latest.recipients.filter((r) => r.respondedAt).length;
    const total = latest.recipients.length;
    if (total > 0) {
      parts.push(`Survey in progress · ${responded}/${total} responses`);
    }
  } else if (summary.preparedNotSent) {
    parts.push("Survey prepared");
  }
  if (summary.deliveryFailureCount > 0) {
    parts.push(
      `${summary.deliveryFailureCount} delivery failure${summary.deliveryFailureCount === 1 ? "" : "s"}`,
    );
  } else if (summary.pendingResponseCount > 0) {
    parts.push(`${summary.pendingResponseCount} pending responses`);
  }
  if (!parts.length) return null;
  return {
    headline: parts[0],
    detail: parts.slice(1).join(" · ") || undefined,
  };
}

function mapKnowledge(links: WorkKnowledgeLink[]): HomeKnowledgeItem[] {
  const items: HomeKnowledgeItem[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const id = link.page.id || link.id;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      title: link.page.title,
      url: link.page.url,
      relatedIssueKey: link.issueKey,
    });
    if (items.length >= 3) break;
  }
  return items;
}

function greetingForHour(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function vacationContextLine(person: Person, now: Date): string | null {
  const state = person.availability.state;
  if (
    state !== "vacation_soon" &&
    state !== "vacation_tomorrow" &&
    state !== "on_vacation"
  ) {
    return null;
  }
  if (state === "on_vacation") return "On time off";
  const start = person.availability.startDate;
  if (!start) return person.availability.label;
  const days = calendarDaysUntil(start, now);
  if (days == null) return null;
  if (days <= 0) return "Vacation today";
  if (days === 1) return "Vacation tomorrow";
  return `Vacation in ${days} days`;
}
