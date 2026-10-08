import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { digestCardContent } from "../../domain/home/digestCardContent";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { useWorkGraph } from "../../app/WorkGraphContext";
import { useOperationalRules } from "../../app/OperationalRulesContext";
import { useJiraAssignmentState } from "../../app/useJiraAssignmentState";
import {
  actionOpenLabel,
  dispatchAppRoute,
  dispatchEmployeeView,
  dispatchFeedbackTab,
  navigatePerformanceView,
  navigateActionTarget,
} from "../../app/actionNavigation";
import { useOptionalPerformanceAnalytics } from "../../app/performanceAnalyticsContext";
import { usePersonNavigation } from "../../app/PersonNavigationContext";
import {
  buildHomeWorkspace,
  resolveHomeRoleVariant,
} from "../../domain/home/buildHomeWorkspace";
import { collectHomeKnowledgeLinks } from "../../domain/home/knowledgeFromGraph";
import { resolveAuthorizedPeopleScope } from "../../domain/organization/authorizedPeopleScope";
import { buildOrganizationModel } from "../../domain/organization/buildOrganizationModel";
import { rosterFromOrgResolution } from "../../domain/organization/orgGraph";
import { resolveSupervisorEmployee } from "../../domain/organization/orgRole";
import { resolveDashboardVariant } from "../../domain/organization/orgRoleRouting";
import { summarizeFeedbackActions } from "../../domain/feedback/feedbackActionSummary";
import { syncFeedbackInboxFromSummary } from "../../platform/feedbackInboxSync";
import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";
import {
  loadPreferences,
  readVisualPreferencesSync,
} from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { resolveJiraBaseUrl } from "../../config/product";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { useDigestPreferences } from "../../hooks/useDigestPreferences";
import { openDigest } from "../../platform/digestNavigation";
import { useGoals } from "../../hooks/useGoals";
import { useOptionalCompanyConfig } from "../../app/CompanyConfigContext";
import { isGoalsEnabled } from "../../app/featureGates";
import { summarizeGoalsForHome } from "../../domain/goals/goalReview";
import { acknowledgeTrayJiraIssue } from "../../platform/trayActionCenter";
import { canOpenPersonBrief } from "../../domain/personAccess";
import { PerformanceStatusBanner } from "../performance/PerformanceStatusBanner";
import { Button } from "../../components/Button/Button";
import {
  applyVisualHomeOverrides,
  readHomeVisualState,
} from "../../fixtures/homeVisualFixture";
import { shouldHideTeamBriefForVisual } from "../../fixtures/dashboardVisualOverrides";
import { useOnboardingResources } from "../../hooks/useOnboardingResources";
import { useResourceLibrary } from "../../hooks/useResourceLibrary";
import { GettingStartedResources } from "../onboarding/GettingStartedResources";
import { OnboardingChecklistCard } from "../onboarding/OnboardingChecklistCard";
import { OnboardingChecklistDrawer } from "../onboarding/OnboardingChecklistDrawer";
import { ResourceLibrary } from "../onboarding/ResourceLibrary";
import { isNewStarter } from "../../domain/onboarding/newStarter";
import { useOnboardingChecklist } from "../../hooks/useOnboardingChecklist";
import { buildOnboardingChecklist } from "../../domain/onboardingChecklist/buildOnboardingChecklist";
import { deriveBambooChecklistSignals } from "../../domain/onboardingChecklist/bambooChecklistSignals";
import { getAccountState } from "../../domain/onboardingChecklist/normalizeOnboardingChecklistData";
import { buildManagerOnboardingRow } from "../../domain/onboardingChecklist/managerChecklistView";
import { syncOnboardingChecklistInbox } from "../../platform/onboardingChecklistNotifications";
import { listNotificationEvents } from "../../platform/notificationEvents";
import { useUpcomingMeetings } from "../../hooks/useUpcomingMeetings";
import { HomeUpcomingMeetings } from "./HomeUpcomingMeetings";
import { buildDashboardSyncStatus } from "../../domain/home/dashboardSyncStatus";
import {
  resolveDashboardDataHealth,
  type DashboardDataHealthState,
} from "../../domain/home/dashboardDataHealth";
import { parseActiveJiraCount } from "../../domain/home/dashboardContextSummary";
import { DirectorExecutiveDashboard } from "./dashboard/DirectorExecutiveDashboard";
import { EmployeeExecutiveDashboard } from "./dashboard/EmployeeExecutiveDashboard";
import { ManagerExecutiveDashboard } from "./dashboard/ManagerExecutiveDashboard";
import { DashboardRoleRouter } from "./dashboard/DashboardRoleRouter";
import { DashboardFirstRunState } from "./dashboard/DashboardFirstRunState";
import { TaskListModal } from "../../components/TaskListModal/TaskListModal";
import { buildTaskListModalRowsFromIssueKeys } from "../../domain/actions/buildTaskListModalRows";
import { formatTrendTaskListModalTitle } from "../../domain/actions/taskListModalPresentation";
import { formatTrendPointModalContext } from "../../domain/analytics/trendChartIssueKeys";
import { navigateAttentionItem } from "../../domain/home/attentionNavigation";
import type { ExecutiveAttentionItem } from "../../domain/home/executiveDashboardModel";
import { DashboardBlockingErrorState } from "./dashboard/DashboardBlockingErrorState";
import { DashboardWorkspaceLoadingState } from "./dashboard/DashboardWorkspaceLoadingState";
import { DashboardSyncBanner } from "./dashboard/DashboardSyncBanner";
import "./dashboard/executive-dashboard.css";
import "./dashboard/executive-dashboard-pass10.css";

import type {
  DateRangeKey,
  TeamPerformanceSnapshot,
} from "../../domain/performance";
import "../performance/performance-dashboard.css";
import "./home.css";

function resolveDashboardTestId(
  health: DashboardDataHealthState,
  visualHomeState: ReturnType<typeof readHomeVisualState>,
  revalidatingFromCache: boolean,
  dashboardRefreshing: boolean,
): string {
  if (visualHomeState === "first-run") return "dashboard-first-run";
  if (visualHomeState === "refreshing-with-cache") {
    return "dashboard-refreshing-with-cache";
  }
  if (visualHomeState === "refresh-stuck") {
    return "dashboard-refresh-stuck";
  }
  if (visualHomeState === "refresh-failed-with-cache") {
    return "dashboard-ready";
  }
  if (health === "refresh_stuck") return "dashboard-refresh-stuck";
  if (revalidatingFromCache && dashboardRefreshing) {
    return "dashboard-refreshing-with-cache";
  }
  if (visualHomeState === "partial") return "dashboard-partial";
  return "dashboard-ready";
}

export function HomePage() {
  const { currentUser } = useCurrentUser();
  const {
    data,
    viewModels,
    errorMessage,
    refresh,
    status,
    refreshing,
    stale,
    performanceLastUpdatedAt,
    revalidatingFromCache,
    refreshStartedAt,
    issueCatalog,
  } = usePerformanceData();
  const dashboardRefreshing = status === "loading" || status === "refreshing";
  const analytics = useOptionalPerformanceAnalytics();
  const { openPerson: openPersonDetail } = usePersonNavigation();
  const surveyData = useFeedbackSurveyStore((state) => state.data);
  const feedbackSummary = useMemo(
    () => summarizeFeedbackActions(surveyData),
    [surveyData],
  );
  useEffect(() => {
    syncFeedbackInboxFromSummary(feedbackSummary);
  }, [feedbackSummary]);
  const graph = useWorkGraph();
  const assignmentState = useJiraAssignmentState(data?.lastUpdatedAt);
  const resourceLibrary = useResourceLibrary();
  const [org, setOrg] = useState<OrgResolutionResult | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(
    () => readVisualPreferencesSync()?.google.calendarConnected ?? false,
  );
  const [homeJiraBaseUrl, setHomeJiraBaseUrl] = useState("");
  const [trendTaskModal, setTrendTaskModal] = useState<{
    title: string;
    issueKeys: string[];
  } | null>(null);

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setOrg(prefs.teamDetection ?? null);
      setCalendarConnected(prefs.google.calendarConnected);
      setHomeJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, [data?.lastUpdatedAt]);

  const organizationModel = useMemo(() => {
    if (!data?.teamSnapshot) return null;
    const orgForScope: OrgResolutionResult | null =
      org?.ok
        ? org
        : data.teamSnapshot.persons[0]
          ? {
              ok: true,
              mode: data.teamSnapshot.mode === "team" ? "team" : "personal",
              employee: data.teamSnapshot.persons[0].bamboo,
              directReports: data.teamSnapshot.persons
                .slice(1)
                .map((person) => person.bamboo),
              fullTeam: [],
              missingFields: [],
              restrictedFields: [],
              diagnostics: [],
              reportingSource: "unknown",
              ambiguousSupervisorNames: 0,
            }
          : null;
    if (!orgForScope?.ok) return null;
    const scope = resolveAuthorizedPeopleScope(
      orgForScope,
      currentUser.person.role,
      undefined,
      currentUser.orgHierarchy ?? null,
    );
    if (scope.mode !== "organization") return null;
    const bambooRoster = rosterFromOrgResolution(orgForScope);
    return buildOrganizationModel({
      snapshot: data.teamSnapshot,
      params: data.reportParams,
      scope,
      feedback: summarizeFeedbackActions(surveyData),
      orgHierarchy: currentUser.orgHierarchy ?? null,
      bambooRoster,
    });
  }, [data, org, currentUser.person.role, currentUser.orgHierarchy, surveyData]);

  const homeRole = resolveHomeRoleVariant(
    currentUser.person.role,
    organizationModel,
    currentUser.orgRole,
  );
  const dashboardVariant = resolveDashboardVariant(currentUser.orgRole);

  const managerContact = useMemo(() => {
    if (currentUser.orgRole !== "individual_contributor" || !org?.ok) {
      return null;
    }
    const roster = rosterFromOrgResolution(org);
    return resolveSupervisorEmployee(org, roster);
  }, [currentUser.orgRole, org]);

  const workspace = viewModels?.getPersonAnalytics(currentUser.person.id);
  const employeeSnapshot = viewModels?.employee;
  const teamSnapshot = viewModels?.teamOverview;
  const deliveryRisk = viewModels?.teamSecondary.deliveryRisk ?? [];

  const knowledgeLinks = useMemo(
    () =>
      collectHomeKnowledgeLinks(graph.knowledgeByIssue, graph.knowledgeByProject),
    [graph.knowledgeByIssue, graph.knowledgeByProject],
  );

  const selfPerson = useMemo(() => {
    const persons = data?.teamSnapshot?.persons;
    if (!persons?.length) return undefined;
    return (
      persons.find((p) => p.id === currentUser.person.id) ?? persons[0]
    );
  }, [data?.teamSnapshot?.persons, currentUser.person.id]);

  const effectiveTeamSnapshot = useMemo((): TeamPerformanceSnapshot | null => {
    if (teamSnapshot) return teamSnapshot;
    if (homeRole === "employee") return null;
    const persons = data?.teamSnapshot?.persons;
    if (!persons?.length) return null;
    return {
      directReportIds: persons
        .filter((p) => p.id !== currentUser.person.id)
        .map((p) => p.id),
      summary: [],
      attention: [],
      attentionTotalCount: 0,
      trends: [],
      workload: [],
      timeOff: [],
      personDetails: {},
    };
  }, [
    teamSnapshot,
    homeRole,
    data?.teamSnapshot?.persons,
    currentUser.person.id,
  ]);

  const { rules: operationalRules } = useOperationalRules();
  const { digest: digestModel } = useDigestPreferences();
  const companyConfig = useOptionalCompanyConfig();
  const goalsFeatureOn = isGoalsEnabled(companyConfig?.effective.features);
  const { goals: homeGoals } = useGoals();
  const goalsHomeSummary = useMemo(
    () => summarizeGoalsForHome(homeGoals),
    [homeGoals],
  );

  const activeJiraCount = useMemo(() => {
    const activeValue =
      employeeSnapshot?.myWeek.summary.find((m) => m.label === "Active")?.value ?? "0";
    return parseActiveJiraCount(activeValue);
  }, [employeeSnapshot]);

  const onboardingMatched = useOnboardingResources({
    department: selfPerson?.bamboo.department,
    jobTitle: selfPerson?.bamboo.jobTitle,
    projects: graph.projects,
    knowledgeLinks,
  });

  const {
    model: selfOnboarding,
    file: onboardingFile,
    setManualComplete,
    refreshBambooStale,
  } = useOnboardingChecklist(selfPerson, surveyData);
  const [checklistDrawerOpen, setChecklistDrawerOpen] = useState(false);
  const [bambooStale, setBambooStale] = useState(false);

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setBambooStale(prefs.sync.bambooStale);
      refreshBambooStale(prefs.sync.bambooStale);
    });
  }, [data?.lastUpdatedAt, refreshBambooStale]);

  useEffect(() => {
    syncOnboardingChecklistInbox(selfOnboarding);
  }, [selfOnboarding]);

  const teamOnboardingProgress = useMemo(() => {
    if (!data?.teamSnapshot || homeRole === "employee") return {};
    const bamboo = deriveBambooChecklistSignals(
      listNotificationEvents(),
      bambooStale,
    );
    const jiraBase = resolveJiraBaseUrl();
    const map: Record<string, ReturnType<typeof buildManagerOnboardingRow>> = {};
    const directIds = new Set(teamSnapshot?.directReportIds ?? []);
    for (const person of data.teamSnapshot.persons) {
      if (!directIds.has(person.id)) continue;
      const hireDate = person.bamboo.hireDate;
      if (!hireDate || !isNewStarter(hireDate)) continue;
      const accountKey = person.bamboo.id || person.id;
      const model = buildOnboardingChecklist({
        person,
        accountState: getAccountState(onboardingFile, accountKey),
        bamboo,
        surveyData,
        jiraBaseUrl: jiraBase,
      });
      if (model) {
        map[person.id] = buildManagerOnboardingRow(
          person.id,
          person.bamboo.displayName,
          model,
        );
      }
    }
    return map;
  }, [
    data?.teamSnapshot,
    homeRole,
    teamSnapshot?.directReportIds,
    onboardingFile,
    surveyData,
    bambooStale,
  ]);

  const managerPersonId = useMemo(() => {
    const supervisorId = selfPerson?.bamboo.supervisorId;
    if (!supervisorId || !data?.teamSnapshot) return undefined;
    return data.teamSnapshot.persons.find((p) => p.bamboo.id === supervisorId)?.id;
  }, [selfPerson, data?.teamSnapshot]);

  const { model: upcomingMeetings } = useUpcomingMeetings({
    enabled: calendarConnected,
    selfEmail: selfPerson?.bamboo.workEmail ?? "",
    selfPersonId: currentUser.person.id,
    teamPersons: data?.teamSnapshot.persons ?? [],
    directReportIds: teamSnapshot?.directReportIds ?? [],
    managerPersonId,
  });

  const workspaceModel = useMemo(() => {
    if (!selfPerson) return null;
    return buildHomeWorkspace({
      role: currentUser.person.role,
      homeRole,
      selfPerson,
      selfPersonId: currentUser.person.id,
      selfDisplayName: selfPerson.bamboo.displayName,
      workspace: workspace ?? null,
      employeeSnapshot: employeeSnapshot ?? null,
      teamSnapshot: homeRole !== "employee" ? effectiveTeamSnapshot : null,
      deliveryRisk: homeRole !== "employee" ? deliveryRisk : [],
      assignmentState,
      surveyData,
      organizationModel,
      knowledgeLinks,
      knowledgeStatus: graph.status,
      reportParams: data?.reportParams,
      teamPersons: data?.teamSnapshot?.persons ?? [],
      operationalRules,
      personalOnboarding: selfOnboarding,
      teamOnboardingProgress,
      dependencyIndex: data?.dependencyIndex,
    });
  }, [
    selfPerson,
    currentUser.person.role,
    homeRole,
    currentUser.person.id,
    workspace,
    employeeSnapshot,
    effectiveTeamSnapshot,
    deliveryRisk,
    assignmentState,
    surveyData,
    organizationModel,
    knowledgeLinks,
    graph.status,
    data?.reportParams,
    data?.teamSnapshot?.persons,
    operationalRules,
    selfOnboarding,
    teamOnboardingProgress,
    data?.dependencyIndex,
  ]);

  const openPerson = (personId: string, tab?: "overview" | "work" | "history") => {
    openPersonDetail(personId, tab);
  };

  const handleAction = (item: import("../../domain/actions/actionTypes").ActionItem) => {
    navigateActionTarget(item.target, { openPerson });
  };

  const trendTaskRows = useMemo(
    () =>
      trendTaskModal
        ? buildTaskListModalRowsFromIssueKeys(
            trendTaskModal.issueKeys,
            data?.teamSnapshot?.persons ?? [],
            homeJiraBaseUrl || resolveJiraBaseUrl(),
            issueCatalog,
          )
        : [],
    [trendTaskModal, data?.teamSnapshot?.persons, homeJiraBaseUrl, issueCatalog],
  );

  const openTrendPoint = useCallback(
    (
      trend: import("../../domain/performance").TrendCardData,
      point: { date: string; value: number; issueKeys?: string[] },
      source: HTMLElement | null,
    ) => {
      const keys = [...new Set(point.issueKeys ?? [])];
      if (keys.length) {
        setTrendTaskModal({
          title: formatTrendTaskListModalTitle(
            formatTrendPointModalContext(trend.label, point.date),
            keys.length,
          ),
          issueKeys: keys,
        });
        return;
      }
      analytics?.openTeamTrendDrilldown(trend, point, source);
    },
    [analytics],
  );

  const handleAttentionView = useCallback(
    (item: ExecutiveAttentionItem) => {
      if (!item.viewTarget) return;
      navigateAttentionItem(item.viewTarget, { openPerson }, item.scrollTargetId);
    },
    [openPerson],
  );

  const openJiraAssignment = async (issueKey: string) => {
    const prefs = await loadPreferences();
    const url = buildJiraIssueBrowseUrl(resolveJiraBaseUrl(prefs), issueKey);
    await acknowledgeTrayJiraIssue(issueKey);
    await openExternalUrl(url);
  };

  const visualHomeState = readHomeVisualState();
  const openPerformanceHome = () => dispatchAppRoute("performance");

  if (visualHomeState === "blocked") {
    return (
      <div className="home-page" data-testid="dashboard-blocked">
        <PerformanceStatusBanner />
        <section className="home-empty-state" role="status">
          <h2 className="home-empty-state__title">Waiting for your profile</h2>
          <p className="home-empty-state__body">
            Dashboard needs your person record from the latest Jira performance sync.
          </p>
        </section>
      </div>
    );
  }

  const hasEverSuccessfulSnapshot = Boolean(
    performanceLastUpdatedAt || data?.lastUpdatedAt || revalidatingFromCache,
  );
  const hasUsableDashboardData = Boolean(workspaceModel);
  const dataHealth = resolveDashboardDataHealth({
    hasEverSuccessfulSnapshot,
    hasUsableDashboardData,
    refreshing: dashboardRefreshing,
    stale,
    errorMessage,
    refreshStartedAt,
    now: Date.now(),
  });

  let effectiveHealth = dataHealth;
  let effectiveStale = stale;
  let effectiveError = errorMessage;
  if (visualHomeState === "refresh-stuck" && hasUsableDashboardData) {
    effectiveHealth = {
      state: "refresh_stuck",
      showSlowRefreshHint: false,
      refreshElapsedMs: 65_000,
    };
  }
  if (visualHomeState === "refresh-failed-with-cache" && hasUsableDashboardData) {
    effectiveHealth = {
      state: "refresh_failed_with_cache",
      showSlowRefreshHint: false,
      refreshElapsedMs: null,
    };
    effectiveStale = true;
    effectiveError = effectiveError || "Performance refresh failed (visual fixture)";
  }

  const dashboardSyncStatus = buildDashboardSyncStatus({
    lastUpdatedAt: performanceLastUpdatedAt,
    refreshing,
    stale: effectiveStale,
    errorMessage: effectiveError,
    healthState: effectiveHealth.state,
    showSlowRefreshHint: effectiveHealth.showSlowRefreshHint,
  });

  if (effectiveHealth.state === "cold_start" || visualHomeState === "first-run") {
    if (status === "loading" || status === "idle") {
      return (
        <>
          <PerformanceStatusBanner />
          <DashboardWorkspaceLoadingState />
        </>
      );
    }
    return (
      <>
        <PerformanceStatusBanner />
        <DashboardFirstRunState onOpenPerformance={openPerformanceHome} />
      </>
    );
  }

  if (effectiveHealth.state === "initial_loading" && !hasUsableDashboardData) {
    return (
      <>
        <PerformanceStatusBanner />
        <DashboardWorkspaceLoadingState />
      </>
    );
  }

  if (effectiveHealth.state === "refresh_failed_without_cache") {
    return (
      <>
        <PerformanceStatusBanner />
        <DashboardBlockingErrorState
          title="Couldn't load dashboard data"
          body="Performance data couldn't be refreshed and no cached snapshot is available."
          errorMessage={errorMessage}
          onRetry={() => void refresh()}
          onOpenPerformance={openPerformanceHome}
        />
      </>
    );
  }

  if (!workspaceModel) {
    return (
      <div className="home-page" data-testid="dashboard-blocked">
        <PerformanceStatusBanner />
        <section className="home-empty-state" role="status">
          <h2 className="home-empty-state__title">Waiting for your profile</h2>
          <p className="home-empty-state__body">
            Dashboard needs your person record from the latest Jira performance sync.
            Check connections and refresh Performance data.
          </p>
        </section>
      </div>
    );
  }

  const displayWorkspace = applyVisualHomeOverrides(workspaceModel);
  const { personal, team, organization } = displayWorkspace;
  const dashboardReadyTestId = resolveDashboardTestId(
    effectiveHealth.state,
    visualHomeState,
    revalidatingFromCache,
    dashboardRefreshing,
  );

  const showGoalsSummary =
    goalsFeatureOn &&
    (goalsHomeSummary.activeCount > 0 || goalsHomeSummary.reviewApproachingCount > 0);
  const goalsProminent = Boolean(showGoalsSummary && goalsHomeSummary.needsAttention);
  const newAssignmentCount = personal.newAssignments.length;
  const performanceTrends = effectiveTeamSnapshot?.trends ?? [];
  const employeeTrends = employeeSnapshot?.trends ?? performanceTrends;
  const selfWorkload = selfPerson?.workload ?? null;

  const sharedHeader = {
    greeting: displayWorkspace.greeting,
    activeJiraCount,
    newAssignmentCount,
    lastUpdatedAt: performanceLastUpdatedAt,
    dashboardSyncStatus,
    refreshing: dashboardRefreshing,
    onRefresh: () => void refresh(),
  };

  const managerTeamBrief =
    shouldHideTeamBriefForVisual()
      ? null
      : team &&
    digestModel?.prefs.showDailyOnHome &&
    digestModel.daily
      ? (() => {
          const content = digestCardContent(digestModel.daily);
          return {
            headline: content.headline,
            detail: content.detail,
            onOpen: () => openDigest("daily"),
          };
        })()
      : null;

  const showDigestRow =
    !team && digestModel?.prefs.showDailyOnHome && Boolean(digestModel.daily);

  return (
    <div className="home-page dashboard-page" data-testid={dashboardReadyTestId}>
      <PerformanceStatusBanner />
      {effectiveHealth.state === "refresh_stuck" && dashboardSyncStatus ? (
        <DashboardSyncBanner
          syncStatus={dashboardSyncStatus}
          onRetry={() => void refresh()}
          onDiagnostics={() => {
            window.dispatchEvent(new CustomEvent("metrio-open-diagnostics"));
          }}
        />
      ) : null}
      <div className="executive-dashboard" data-testid="dashboard-first-viewport">
      <DashboardRoleRouter
        variant={dashboardVariant}
        leadership={
          organization && team ? (
            <DirectorExecutiveDashboard
              {...sharedHeader}
              personal={personal}
              team={team}
              organization={organization}
              directIndividualContributorCount={
                currentUser.orgHierarchy?.directIndividualContributorIds.length ?? 0
              }
              teamSnapshot={effectiveTeamSnapshot}
              deliveryRiskCount={deliveryRisk.length}
              trends={performanceTrends}
              onOpenAction={handleAction}
              actionOpenLabel={actionOpenLabel}
              onOpenTrendPoint={openTrendPoint}
              onOpenDeliveryRisk={() => {
                navigatePerformanceView("delivery-risk");
              }}
              onOpenDirectorView={() => {
                navigatePerformanceView("overview");
              }}
              goalsSummary={showGoalsSummary ? goalsHomeSummary : null}
              goalsFeatureOn={goalsFeatureOn}
              goalsProminent={goalsProminent}
              onAttentionView={handleAttentionView}
              jiraBaseUrl={homeJiraBaseUrl}
            />
          ) : null
        }
        teamManager={
          team ? (
            <ManagerExecutiveDashboard
              {...sharedHeader}
              personal={personal}
              team={team}
              teamSnapshot={effectiveTeamSnapshot}
              deliveryRiskCount={deliveryRisk.length}
              deliveryRiskRows={deliveryRisk}
              trends={performanceTrends}
              onOpenAction={handleAction}
              actionOpenLabel={actionOpenLabel}
              onOpenTrendPoint={openTrendPoint}
              onOpenDeliveryRisk={() => {
                navigatePerformanceView("delivery-risk");
              }}
              onOpenTeamOverview={() => {
                navigatePerformanceView("overview");
              }}
              onOpenPerson={(personId) => openPerson(personId)}
              onOpenJiraAssignment={(key) => void openJiraAssignment(key)}
              onOpenMyWeek={() => {
                dispatchAppRoute("performance");
                dispatchEmployeeView("my-week");
              }}
              onOpenFeedback={() => {
                dispatchAppRoute("feedback");
                dispatchFeedbackTab("delivery");
              }}
              teamPersons={data?.teamSnapshot?.persons ?? []}
              goalsSummary={showGoalsSummary ? goalsHomeSummary : null}
              goalsFeatureOn={goalsFeatureOn}
              goalsProminent={goalsProminent}
              canOpenPersonBrief={(id) => canOpenPersonBrief(currentUser, id)}
              teamBrief={managerTeamBrief}
              onAttentionView={handleAttentionView}
              jiraBaseUrl={homeJiraBaseUrl}
            />
          ) : null
        }
        employee={
          <EmployeeExecutiveDashboard
            {...sharedHeader}
            personal={personal}
            selfWorkload={selfWorkload}
            selfAvailability={selfPerson?.availability}
            trends={employeeTrends}
            onOpenAction={handleAction}
            actionOpenLabel={actionOpenLabel}
            onOpenJiraAssignment={(key) => void openJiraAssignment(key)}
            onOpenMyWeek={() => {
              dispatchAppRoute("performance");
              dispatchEmployeeView("my-week");
            }}
            goalsSummary={showGoalsSummary ? goalsHomeSummary : null}
            goalsFeatureOn={goalsFeatureOn}
            goalsProminent={goalsProminent}
            showManagerCard={currentUser.orgRole === "individual_contributor"}
            managerContact={managerContact}
            selfDepartment={selfPerson?.bamboo.department}
            onAttentionView={handleAttentionView}
            jiraBaseUrl={homeJiraBaseUrl}
            onOpenTrendPoint={openTrendPoint}
          />
        }
      />
      </div>

      {showDigestRow ? (
        <div className="dashboard-digest-row executive-lower-section">
          {!team && digestModel?.prefs.showDailyOnHome && digestModel.daily ? (
            <section
              className="home-card dashboard-digest-card"
              aria-label="Today's brief"
              data-testid="dashboard-todays-brief"
            >
              <h2 className="home-card__title home-card__title--section">Today&apos;s brief</h2>
              {(() => {
                const content = digestCardContent(digestModel.daily);
                return (
                  <>
                    <p className="dashboard-digest-card__headline">{content.headline}</p>
                    <p className="dashboard-digest-card__detail">{content.detail}</p>
                  </>
                );
              })()}
              <div className="home-card__actions">
                <Button variant="secondary" onClick={() => openDigest("daily")}>
                  Open today&apos;s brief
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {calendarConnected && upcomingMeetings?.meetings.length ? (
        <HomeUpcomingMeetings
          meetings={upcomingMeetings.meetings}
          managerView={Boolean(team)}
          jiraBaseUrl={homeJiraBaseUrl}
          onPrepareOneOnOne={(personId, periodPreset: DateRangeKey) => {
            window.dispatchEvent(
              new CustomEvent("metrio-open-person-brief", {
                detail: {
                  personId,
                  periodPreset,
                  prepForOneOnOne: true,
                },
              }),
            );
          }}
          onOpenTeamOverview={() => {
            navigatePerformanceView("overview");
          }}
        />
      ) : null}

      {selfPerson?.bamboo.hireDate && isNewStarter(selfPerson.bamboo.hireDate) && !team ? (
        selfOnboarding ? (
          <OnboardingChecklistCard
            model={selfOnboarding}
            onOpenDetail={() => setChecklistDrawerOpen(true)}
            compact
          />
        ) : (
          <GettingStartedResources
            bamboo={selfPerson.bamboo}
            matched={onboardingMatched}
            onViewAll={resourceLibrary.openLibrary}
            compact
          />
        )
      ) : null}

      {selfPerson ? (
        <ResourceLibrary
          open={resourceLibrary.open}
          onClose={resourceLibrary.closeLibrary}
          resources={onboardingMatched.all}
          byGroup={onboardingMatched.byGroup}
        />
      ) : null}

      {selfOnboarding ? (
        <OnboardingChecklistDrawer
          open={checklistDrawerOpen}
          model={selfOnboarding}
          onClose={() => setChecklistDrawerOpen(false)}
          onManualToggle={(id, complete) => void setManualComplete(id, complete)}
        />
      ) : null}

      <TaskListModal
        open={trendTaskModal != null}
        onClose={() => setTrendTaskModal(null)}
        title={trendTaskModal?.title ?? ""}
        rows={trendTaskRows}
        onOpenIssue={(issueKey) => {
          void openJiraAssignment(issueKey);
        }}
      />
    </div>
  );
}
