import { useMemo } from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { useWorkGraph } from "../../app/WorkGraphContext";
import { useOperationalRules } from "../../app/OperationalRulesContext";
import { useJiraAssignmentState } from "../../app/useJiraAssignmentState";
import {
  actionOpenLabel,
  dispatchAppRoute,
  dispatchEmployeeView,
  dispatchFeedbackTab,
  dispatchPerformanceTab,
  navigateActionTarget,
} from "../../app/actionNavigation";
import { useOptionalPerformanceAnalytics } from "../../app/performanceAnalyticsContext";
import { bambooEmployeePortalUrl } from "../../config/bambooPortal";
import {
  buildHomeWorkspace,
  resolveHomeRoleVariant,
} from "../../domain/home/buildHomeWorkspace";
import { collectHomeKnowledgeLinks } from "../../domain/home/knowledgeFromGraph";
import { resolveAuthorizedPeopleScope } from "../../domain/organization/authorizedPeopleScope";
import { buildOrganizationModel } from "../../domain/organization/buildOrganizationModel";
import { summarizeFeedbackActions } from "../../domain/feedback/feedbackActionSummary";
import { syncFeedbackInboxFromSummary } from "../../platform/feedbackInboxSync";
import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { resolveJiraBaseUrl } from "../../config/product";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openProjectCockpit } from "../../platform/projectCockpitNavigation";
import { useDigestPreferences } from "../../hooks/useDigestPreferences";
import { openDigest } from "../../platform/digestNavigation";
import { useGoals } from "../../hooks/useGoals";
import { useOptionalCompanyConfig } from "../../app/CompanyConfigContext";
import { isGoalsEnabled } from "../../app/featureGates";
import { summarizeGoalsForHome } from "../../domain/goals/goalReview";
import { acknowledgeTrayJiraIssue } from "../../platform/trayActionCenter";
import { canOpenPersonBrief } from "../../domain/personAccess";
import { ActionQueueSection } from "../performance/ActionQueueSection";
import { PerformanceStatusBanner } from "../performance/PerformanceStatusBanner";
import { Button } from "../../components/Button/Button";
import { useEffect, useState } from "react";
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
import type { DateRangeKey } from "../../domain/performance";
import "../performance/performance-dashboard.css";
import "./home.css";

export function HomePage() {
  const { currentUser } = useCurrentUser();
  const { data, viewModels, uiState } = usePerformanceData();
  const analytics = useOptionalPerformanceAnalytics();
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
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [homeJiraBaseUrl, setHomeJiraBaseUrl] = useState("");

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
    );
    if (scope.mode !== "organization") return null;
    return buildOrganizationModel({
      snapshot: data.teamSnapshot,
      params: data.reportParams,
      scope,
      feedback: summarizeFeedbackActions(surveyData),
    });
  }, [data, org, currentUser.person.role, surveyData]);

  const homeRole = resolveHomeRoleVariant(
    currentUser.person.role,
    organizationModel,
  );

  const workspace = viewModels?.getPersonAnalytics(currentUser.person.id);
  const employeeSnapshot = viewModels?.employee;
  const teamSnapshot = viewModels?.teamOverview;
  const deliveryRisk = viewModels?.teamSecondary.deliveryRisk ?? [];

  const knowledgeLinks = useMemo(
    () =>
      collectHomeKnowledgeLinks(graph.knowledgeByIssue, graph.knowledgeByProject),
    [graph.knowledgeByIssue, graph.knowledgeByProject],
  );

  const selfPerson =
    data?.teamSnapshot.persons.find((p) => p.id === currentUser.person.id) ??
    data?.teamSnapshot.persons[0];

  const { rules: operationalRules } = useOperationalRules();
  const { digest: digestModel } = useDigestPreferences();
  const companyConfig = useOptionalCompanyConfig();
  const goalsFeatureOn = isGoalsEnabled(companyConfig?.effective.features);
  const { goals: homeGoals } = useGoals();
  const goalsHomeSummary = useMemo(
    () => summarizeGoalsForHome(homeGoals),
    [homeGoals],
  );

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
      teamSnapshot: homeRole !== "employee" ? teamSnapshot ?? null : null,
      deliveryRisk: homeRole !== "employee" ? deliveryRisk : [],
      assignmentState,
      surveyData,
      organizationModel,
      knowledgeLinks,
      knowledgeStatus: graph.status,
      reportParams: data?.reportParams,
      teamPersons: data?.teamSnapshot.persons ?? [],
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
    teamSnapshot,
    deliveryRisk,
    assignmentState,
    surveyData,
    organizationModel,
    knowledgeLinks,
    graph.status,
    data?.reportParams,
    data?.teamSnapshot.persons,
    operationalRules,
    selfOnboarding,
    teamOnboardingProgress,
    data?.dependencyIndex,
  ]);

  const openPerson = (personId: string, tab?: "overview" | "work" | "history") => {
    if (analytics) {
      analytics.openPersonDrawer({ personId, tab });
      return;
    }
    window.dispatchEvent(new CustomEvent("metrio-open-person", { detail: personId }));
  };

  const handleAction = (item: import("../../domain/actions/actionTypes").ActionItem) => {
    navigateActionTarget(item.target, { openPerson });
  };

  const openJiraAssignment = async (issueKey: string) => {
    const prefs = await loadPreferences();
    const url = buildJiraIssueBrowseUrl(resolveJiraBaseUrl(prefs), issueKey);
    await acknowledgeTrayJiraIssue(issueKey);
    await openExternalUrl(url);
  };

  if (uiState === "initial-loading" && !workspaceModel) {
    return (
      <div className="home-page" data-testid="home-loading">
        <PerformanceStatusBanner />
        <div className="home-skeleton" aria-busy="true" />
      </div>
    );
  }

  if (!workspaceModel) {
    return (
      <div className="home-page">
        <PerformanceStatusBanner />
        <p className="performance-inline-empty" role="status">
          Home will appear when your work data is ready.
        </p>
      </div>
    );
  }

  const { personal, team, organization } = workspaceModel;

  return (
    <div className="home-page" data-testid="home-ready">
      <PerformanceStatusBanner />
      <header className="home-header">
        <h1 className="home-header__title">{workspaceModel.greeting}</h1>
        <p className="home-header__context">{workspaceModel.contextLine}</p>
      </header>

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
            dispatchAppRoute("performance");
            dispatchPerformanceTab("overview");
          }}
        />
      ) : null}

      {digestModel?.prefs.showDailyOnHome && digestModel.daily ? (
        <section className="home-card home-card--brief" aria-label="Today's brief" data-testid="home-daily-brief">
          <h2 className="home-card__title">
            {team ? "Team brief" : "Today's brief"}
          </h2>
          <p className="home-card__meta">{digestModel.daily.summaryLine}</p>
          <Button
            variant="secondary"
            onClick={() => openDigest("daily")}
          >
            View details
          </Button>
        </section>
      ) : null}

      {digestModel?.prefs.showWeeklyOnHome &&
      digestModel.weekly &&
      team ? (
        <section className="home-card" aria-label="Weekly digest" data-testid="home-weekly-digest">
          <h2 className="home-card__title">Weekly digest</h2>
          <p className="home-card__meta">{digestModel.weekly.summaryLine}</p>
          <Button variant="ghost" onClick={() => openDigest("weekly")}>
            View details
          </Button>
        </section>
      ) : null}

      {goalsFeatureOn &&
      (goalsHomeSummary.activeCount > 0 || goalsHomeSummary.reviewApproachingCount > 0) ? (
        <section
          className="home-card"
          aria-label="Goals"
          data-testid="home-goals-summary"
        >
          <h2 className="home-card__title">{team ? "Goal reviews" : "Goals"}</h2>
          <p className="home-card__meta">
            {goalsHomeSummary.activeCount} active
            {goalsHomeSummary.reviewApproachingCount > 0
              ? ` · ${goalsHomeSummary.reviewApproachingCount} review approaching`
              : ""}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              dispatchAppRoute("performance");
              if (team) {
                window.dispatchEvent(
                  new CustomEvent("metrio-open-performance-tab", {
                    detail: "goals",
                  }),
                );
              } else {
                dispatchEmployeeView("goals");
              }
            }}
          >
            View goals
          </Button>
        </section>
      ) : null}

      <div className="home-layout">
        <div className="home-column home-column--personal">
          <p className="home-section-label">My work</p>

          {selfPerson?.bamboo.hireDate && isNewStarter(selfPerson.bamboo.hireDate) ? (
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

          <ActionQueueSection
            title="My focus"
            items={personal.focus}
            emptyMessage="Nothing needs your attention right now."
            onOpen={handleAction}
            openLabel={actionOpenLabel}
          />

          <section className="home-card" aria-label="New assignments">
            <h2 className="home-card__title">New assignments</h2>
            {personal.newAssignments.length === 0 ? (
              <p className="home-card__empty">No unread Jira assignments.</p>
            ) : (
              <ul className="home-link-list">
                {personal.newAssignments.map((record) => (
                  <li key={record.issueKey}>
                    <button
                      type="button"
                      className="home-link-list__button"
                      onClick={() => void openJiraAssignment(record.issueKey)}
                    >
                      {record.issueKey} · {record.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                dispatchAppRoute("performance");
                dispatchEmployeeView("my-week");
              }}
            >
              View all · My Week
            </Button>
          </section>

          {personal.timeOff ? (
            <section className="home-card" aria-label="Upcoming time off">
              <h2 className="home-card__title">Upcoming time off</h2>
              <p className="home-card__lead">{personal.timeOff.headline}</p>
              <p className="home-card__meta">{personal.timeOff.rangeLabel}</p>
              {personal.timeOff.activeCount > 0 ? (
                <p className="home-card__meta">
                  {personal.timeOff.activeCount} active tasks
                  {personal.timeOff.inReviewCount > 0
                    ? ` · ${personal.timeOff.inReviewCount} in review`
                    : ""}
                </p>
              ) : null}
              <div className="home-card__actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    dispatchAppRoute("performance");
                    dispatchEmployeeView("my-week");
                  }}
                >
                  View work
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void openExternalUrl(bambooEmployeePortalUrl())}
                >
                  Open BambooHR
                </Button>
              </div>
            </section>
          ) : null}

          <section className="home-card" aria-label="Relevant knowledge">
            <h2 className="home-card__title">Relevant knowledge</h2>
            {personal.knowledgeStatus === "unavailable" ? (
              <p className="home-card__empty">Knowledge unavailable.</p>
            ) : personal.knowledgeStatus === "loading" ? (
              <p className="home-card__meta" aria-busy="true">Loading knowledge…</p>
            ) : personal.knowledge.length === 0 ? (
              <p className="home-card__empty">Open Performance to load project knowledge.</p>
            ) : (
              <ul className="home-link-list">
                {personal.knowledge.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="home-link-list__button"
                      onClick={() => void openExternalUrl(item.url)}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="home-card" aria-label="Performance snapshot">
            <h2 className="home-card__title">Performance snapshot</h2>
            <dl className="home-metrics">
              {personal.performanceSnapshot.metrics.map((metric) => (
                <div key={metric.label} className="home-metrics__row">
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
            <Button variant="secondary" onClick={() => dispatchAppRoute("performance")}>
              Open Performance
            </Button>
          </section>

          {selfPerson?.bamboo &&
          (!selfPerson.bamboo.hireDate || !isNewStarter(selfPerson.bamboo.hireDate)) ? (
            <section className="home-card" aria-label="Resources">
              <h2 className="home-card__title">Resources</h2>
              <p className="home-card__meta">
                {onboardingMatched.all.length} links for your team and role
              </p>
              <Button variant="ghost" onClick={resourceLibrary.openLibrary}>
                Open resource library
              </Button>
            </section>
          ) : null}
        </div>

        {team ? (
          <div className="home-column home-column--team">
            <p className="home-section-label">Team</p>

            <ActionQueueSection
              title="Team actions"
              items={team.actions}
              emptyMessage="No high-priority team actions right now."
              onOpen={handleAction}
              openLabel={actionOpenLabel}
            />

            {team.dependencySignals.length ? (
              <section
                className="home-card"
                aria-label="Delivery dependencies"
                data-testid="home-dependency-signals"
              >
                <h2 className="home-card__title">Dependencies</h2>
                <ul className="home-calendar-list">
                  {team.dependencySignals.map((signal) => (
                    <li key={signal.id} className="home-calendar-row">
                      <span className="home-calendar-row__title">{signal.title}</span>
                      <span className="home-calendar-row__meta">{signal.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="home-card" aria-label="Delivery summary">
              <h2 className="home-card__title">Delivery summary</h2>
              <p className="home-card__meta">
                {team.deliverySummary.problematic} problematic ·{" "}
                {team.deliverySummary.longReview} in long Review ·{" "}
                {team.deliverySummary.backflowSignals} backflow signals
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  dispatchAppRoute("performance");
                  dispatchPerformanceTab("delivery-risk");
                }}
              >
                Delivery Risk
              </Button>
            </section>

            {team.projectSignals.length > 0 ? (
              <section className="home-card" aria-label="Project signals">
                <h2 className="home-card__title">Project signals</h2>
                <ul className="home-link-list">
                  {team.projectSignals.map((signal) => (
                    <li key={signal.projectKey}>
                      <button
                        type="button"
                        className="home-link-list__button"
                        onClick={() => openProjectCockpit(signal.projectKey)}
                      >
                        {signal.projectKey} · {signal.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="home-card" aria-label="Upcoming availability">
              <h2 className="home-card__title">Upcoming availability</h2>
              <p className="home-card__meta">
                {team.awayNextWeek} people away next week
              </p>
              <ul className="home-link-list">
                {team.availabilityPreview.map((row) => (
                  <li key={row.personId}>
                    <button
                      type="button"
                      className="home-link-list__button"
                      onClick={() => openPerson(row.personId, "overview")}
                    >
                      {row.personName} · {row.rangeLabel}
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                onClick={() => {
                  dispatchAppRoute("performance");
                  dispatchPerformanceTab("overview");
                }}
              >
                Team overview
              </Button>
            </section>

            {team.newStarters.length > 0 ? (
              <section className="home-card" aria-label="New starters">
                <h2 className="home-card__title">New starters</h2>
                <ul className="home-link-list">
                  {team.newStarters.map((row) => (
                    <li key={row.personId} className="home-new-starter-row">
                      <button
                        type="button"
                        className="home-link-list__button"
                        onClick={() => openPerson(row.personId)}
                      >
                        {row.personName} · {row.dayLabel}
                        {row.progressLabel ? ` · ${row.progressLabel}` : ""}
                      </button>
                      {row.remainingTitles?.length ? (
                        <p className="home-card__meta">
                          Remaining: {row.remainingTitles.join(" · ")}
                        </p>
                      ) : null}
                      {canOpenPersonBrief(currentUser, row.personId) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent("metrio-open-person-brief", {
                                detail: { personId: row.personId },
                              }),
                            );
                          }}
                        >
                          Prepare for 1:1
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {team.feedback ? (
              <section className="home-card" aria-label="Feedback">
                <h2 className="home-card__title">Feedback</h2>
                <p className="home-card__lead">{team.feedback.headline}</p>
                {team.feedback.detail ? (
                  <p className="home-card__meta">{team.feedback.detail}</p>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => {
                    dispatchAppRoute("feedback");
                    dispatchFeedbackTab("delivery");
                  }}
                >
                  Open Feedback
                </Button>
              </section>
            ) : null}
          </div>
        ) : null}

        {organization ? (
          <div className="home-column home-column--org">
            <p className="home-section-label">Organization</p>
            <section className="home-card" aria-label="Organization signals">
              <h2 className="home-card__title">Organization signals</h2>
              <p className="home-card__meta">
                {organization.signalCount} signals ·{" "}
                {organization.teamsNeedingAttention} teams need attention
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  dispatchAppRoute("performance");
                  dispatchPerformanceTab("overview");
                }}
              >
                Open director view
              </Button>
            </section>
            <section className="home-card" aria-label="Capacity">
              <h2 className="home-card__title">Capacity</h2>
              <ul className="home-link-list">
                {organization.model.teamCapacity
                  .filter((row) => row.awayNextWeek > 0)
                  .slice(0, 6)
                  .map((row) => (
                    <li key={row.teamId}>
                      <span className="home-card__meta">
                        <strong>{row.teamName}</strong> · {row.label}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
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
    </div>
  );
}
