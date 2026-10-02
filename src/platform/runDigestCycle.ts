import { buildEmployeeDailyBrief } from "../domain/digests/buildEmployeeDailyBrief";
import { buildManagerDailyBrief } from "../domain/digests/buildManagerDailyBrief";
import { buildWeeklyManagerDigest } from "../domain/digests/buildWeeklyManagerDigest";
import { buildDirectorWeeklyDigest } from "../domain/digests/buildDirectorWeeklyDigest";
import { collectTeamDigestMetrics } from "../domain/digests/digestMetrics";
import { pushDigestHistory } from "../domain/digests/digestHistory";
import { getCurrentWeekRange } from "../domain/periods/dateRange";
import { computeTeamFlowMetrics } from "../domain/periods/issuePeriodMetrics";
import { isManagerRole, isDirectorRole } from "../domain/performance";
import { summarizeFeedbackActions } from "../domain/feedback/feedbackActionSummary";
import { buildTeamActions } from "../domain/actions/buildTeamActions";
import { buildHomeWorkspace, resolveHomeRoleVariant } from "../domain/home/buildHomeWorkspace";
import { buildTeamRadar } from "../domain/radar/teamRadar";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import {
  buildPerformanceViewModels,
  type PerformanceViewModels,
} from "../services/performance/performanceViewModel";
import { readJiraAssignmentState } from "./jiraAssignmentNotifications";
import {
  DEFAULT_DIGEST_PREFERENCES,
  type DigestPersistedState,
  type DigestUserPreferences,
} from "./digestPreferences";
import type { AppPreferences } from "./preferences";
import { recordNotificationEvent } from "./notificationEvents";
import { normalizeOperationalRules } from "../domain/operationalRules/normalizeOperationalRules";
import type { UserRole } from "../domain/types";
import type { OrganizationOverviewModel } from "../domain/organization/organizationTypes";
import { EMPTY_JIRA_ASSIGNMENT_STATE } from "../domain/jira/jiraAssignmentTracking";

export interface RunDigestCycleInput {
  prefs: AppPreferences;
  result: PerformanceFetchResult;
  viewModels: PerformanceViewModels | null;
  selfPersonId: string;
  role: UserRole;
  organizationModel?: OrganizationOverviewModel | null;
}

export interface RunDigestCycleOutput {
  prefs: AppPreferences;
  state: DigestPersistedState;
}

function isWeekendLocal(now: Date): boolean {
  const day = now.getDay();
  return day === 0 || day === 6;
}

export function runDigestCycle(input: RunDigestCycleInput): RunDigestCycleOutput {
  const now = new Date(input.result.lastUpdatedAt || Date.now());
  const digestPrefs = input.prefs.digests ?? DEFAULT_DIGEST_PREFERENCES;
  let state: DigestPersistedState = {
    ...EMPTY_DIGEST_STATE(),
    ...input.prefs.digestState,
    history: input.prefs.digestState?.history ?? { daily: [], weekly: [] },
  };

  const self =
    input.result.teamSnapshot.persons.find((p) => p.id === input.selfPersonId) ??
    input.result.teamSnapshot.persons[0];
  const homeRole = resolveHomeRoleVariant(
    input.role,
    input.organizationModel ?? null,
  );
  const assignmentState = readJiraAssignmentState(input.prefs) ?? EMPTY_JIRA_ASSIGNMENT_STATE;
  const rules = normalizeOperationalRules(input.prefs.operationalRules);
  const vm =
    input.viewModels ??
    buildPerformanceViewModels(
      input.result,
      input.selfPersonId,
      "30d",
      undefined,
      "team",
      rules,
    );
  const employeeSnapshot = vm.employee ?? null;
  const teamSnapshot = vm.teamOverview ?? null;
  const deliveryRisk = vm.teamSecondary.deliveryRisk ?? [];
  const params = input.result.reportParams;

  const weekFlow = computeTeamFlowMetrics(
    input.result.teamSnapshot.persons,
    getCurrentWeekRange(now),
    params,
  );
  const currentMetrics = collectTeamDigestMetrics({
    snapshot: input.result.teamSnapshot,
    deliveryRisk,
    params,
    completedInWeek: weekFlow.completedCount,
    backflowInWeek: weekFlow.backflowCount,
    rules,
    now,
  });

  const previousMetrics = state.lastMetrics;

  if (digestPrefs.dailyBriefEnabled && self) {
    let daily;
    if (homeRole === "employee") {
      daily = buildEmployeeDailyBrief({
        selfPerson: self,
        employeeSnapshot,
        assignmentState,
        now,
      });
    } else if (teamSnapshot && (isManagerRole(input.role) || isDirectorRole(input.role))) {
      const feedback = summarizeFeedbackActions(undefined);
      const home = buildHomeWorkspace({
        role: input.role,
        homeRole,
        selfPerson: self,
        selfPersonId: input.selfPersonId,
        workspace: vm?.getPersonAnalytics(self.id) ?? null,
        employeeSnapshot,
        teamSnapshot,
        deliveryRisk,
        assignmentState,
        surveyData: null,
        organizationModel: input.organizationModel ?? null,
        knowledgeLinks: [],
        knowledgeStatus: "idle",
        reportParams: params,
        teamPersons: input.result.teamSnapshot.persons,
        selfDisplayName: self.bamboo.displayName,
        operationalRules: rules,
        now,
      });
      const team = home.team;
      if (team) {
        const teamActions = buildTeamActions({
          snapshot: teamSnapshot,
          deliveryRisk,
          feedback,
          operationalRules: rules,
          now,
        });
        daily = buildManagerDailyBrief({
          team,
          teamActions,
          previousMetrics,
          currentMetrics,
          feedback,
          now,
        });
      }
    }
    if (daily) {
      const prevDaily = state.currentDaily;
      if (prevDaily && prevDaily.id !== daily.id) {
        state.history = pushDigestHistory(state.history, prevDaily);
      }
      state.currentDaily = daily;
      maybeNotifyDigest(
        daily,
        digestPrefs,
        state,
        "daily",
        isWeekendLocal(now),
      );
    }
  }

  const shouldRunWeekly =
    digestPrefs.weeklyDigestEnabled &&
    (homeRole === "manager" || homeRole === "director");

  if (shouldRunWeekly && vm) {
    const radar = buildTeamRadar(
      input.result.teamSnapshot,
      params,
      now,
      rules,
    );
    let weekly;
    if (homeRole === "director" && input.organizationModel) {
      weekly = buildDirectorWeeklyDigest(input.organizationModel, now);
    } else if (teamSnapshot) {
      const home = buildHomeWorkspace({
        role: input.role,
        homeRole: "manager",
        selfPerson: self!,
        selfPersonId: input.selfPersonId,
        workspace: vm.getPersonAnalytics(self!.id),
        employeeSnapshot,
        teamSnapshot,
        deliveryRisk,
        assignmentState,
        surveyData: null,
        organizationModel: null,
        knowledgeLinks: [],
        knowledgeStatus: "idle",
        reportParams: params,
        teamPersons: input.result.teamSnapshot.persons,
        selfDisplayName: self!.bamboo.displayName,
        operationalRules: rules,
        now,
      });
      weekly = buildWeeklyManagerDigest({
        snapshot: input.result.teamSnapshot,
        reportData: input.result.reportData,
        radarItems: radar,
        kpiSnapshots: input.result.kpiSnapshots,
        team: home.team,
        deliveryRisk,
        previousMetrics,
        operationalRules: rules,
        now,
      });
    }
    if (weekly) {
      const prevWeekly = state.currentWeekly;
      if (prevWeekly && prevWeekly.id !== weekly.id) {
        state.history = pushDigestHistory(state.history, prevWeekly);
      }
      state.currentWeekly = weekly;
      maybeNotifyDigest(
        weekly,
        digestPrefs,
        state,
        "weekly",
        isWeekendLocal(now),
      );
    }
  }

  state.lastMetrics = currentMetrics;

  const nextPrefs: AppPreferences = {
    ...input.prefs,
    digestState: state,
  };

  return { prefs: nextPrefs, state };
}

function EMPTY_DIGEST_STATE(): DigestPersistedState {
  return { history: { daily: [], weekly: [] } };
}

function maybeNotifyDigest(
  digest: import("../domain/digests/digestTypes").OperationalDigest,
  prefs: DigestUserPreferences,
  state: DigestPersistedState,
  kind: "daily" | "weekly",
  isWeekend: boolean,
): void {
  if (isWeekend) return;
  const notify =
    kind === "daily" ? prefs.notifyDailyBrief : prefs.notifyWeeklyDigest;
  if (!notify) return;
  const notifiedId =
    kind === "daily" ? state.notifiedDailyId : state.notifiedWeeklyId;
  if (notifiedId === digest.id) return;

  const type = kind === "daily" ? "daily_brief_ready" : "weekly_digest_ready";
  recordNotificationEvent({
    type,
    title: kind === "daily" ? "Daily brief ready" : "Weekly digest ready",
    message: digest.summaryLine,
    dedupeKey: `${type}:${digest.id}`,
    target: { kind: "digest", digestKind: kind },
    source: "metrio",
    actionRequired: false,
  });

  if (kind === "daily") state.notifiedDailyId = digest.id;
  else state.notifiedWeeklyId = digest.id;
}
