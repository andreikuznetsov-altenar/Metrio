import { useMemo } from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { useWorkGraph } from "../../app/WorkGraphContext";
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
import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { resolveJiraBaseUrl } from "../../config/product";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { acknowledgeTrayJiraIssue } from "../../platform/trayActionCenter";
import { ActionQueueSection } from "../performance/ActionQueueSection";
import { PerformanceStatusBanner } from "../performance/PerformanceStatusBanner";
import { Button } from "../../components/Button/Button";
import { useEffect, useState } from "react";
import { useOnboardingResources } from "../../hooks/useOnboardingResources";
import { useResourceLibrary } from "../../hooks/useResourceLibrary";
import { GettingStartedResources } from "../onboarding/GettingStartedResources";
import { ResourceLibrary } from "../onboarding/ResourceLibrary";
import { isNewStarter } from "../../domain/onboarding/newStarter";
import "../performance/performance-dashboard.css";
import "./home.css";

export function HomePage() {
  const { currentUser } = useCurrentUser();
  const { data, viewModels, uiState } = usePerformanceData();
  const analytics = useOptionalPerformanceAnalytics();
  const surveyData = useFeedbackSurveyStore((state) => state.data);
  const graph = useWorkGraph();
  const assignmentState = useJiraAssignmentState(data?.lastUpdatedAt);
  const resourceLibrary = useResourceLibrary();
  const [org, setOrg] = useState<OrgResolutionResult | null>(null);

  useEffect(() => {
    void loadPreferences().then((prefs) => setOrg(prefs.teamDetection ?? null));
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

  const onboardingMatched = useOnboardingResources({
    department: selfPerson?.bamboo.department,
    jobTitle: selfPerson?.bamboo.jobTitle,
    projects: graph.projects,
    knowledgeLinks,
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

      <div className="home-layout">
        <div className="home-column home-column--personal">
          <p className="home-section-label">My work</p>

          {selfPerson?.bamboo.hireDate && isNewStarter(selfPerson.bamboo.hireDate) ? (
            <GettingStartedResources
              bamboo={selfPerson.bamboo}
              matched={onboardingMatched}
              onViewAll={resourceLibrary.openLibrary}
              compact
            />
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
                    <li key={row.personId}>
                      <button
                        type="button"
                        className="home-link-list__button"
                        onClick={() => openPerson(row.personId)}
                      >
                        {row.personName} · {row.dayLabel}
                      </button>
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
    </div>
  );
}
