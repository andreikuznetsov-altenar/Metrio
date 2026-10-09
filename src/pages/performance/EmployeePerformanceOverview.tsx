import { useEffect, useMemo, useState } from "react";
import { markPerformanceTabSwitch, usePaintedSelection } from "./useKeepMountedView";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useOptionalPerformanceAnalytics } from "../../app/performanceAnalyticsContext";
import { usePersonNavigation } from "../../app/PersonNavigationContext";
import { usePerformanceExport } from "../../app/PerformanceExportContext";
import {
  readPersistedEmployeePerformanceView,
  writePersistedEmployeePerformanceView,
} from "../../app/performanceViewPersistence";
import type { PersonWorkRowData } from "../../domain/analytics/personAnalyticsWorkspace";
import type { EmployeePerformanceView, MetricCardData } from "../../domain/performance";
import { EmployeeMyWeekView } from "./EmployeeMyWeekView";
import { EmployeePerformanceSubnav } from "./EmployeePerformanceSubnav";
import { EmployeeTrendsView } from "./EmployeeTrendsView";
import { EmployeeWorkHistoryView } from "./EmployeeWorkHistoryView";
import { GroupedAttentionList } from "./GroupedAttentionList";
import { buildEmployeeFocusActions } from "../../domain/actions/buildEmployeeFocus";
import {
  actionOpenLabel,
  navigateActionTarget,
} from "../../app/actionNavigation";
import { ActionQueueSection } from "./ActionQueueSection";
import { GettingStartedSection } from "./GettingStartedSection";
import { useWorkGraph } from "../../app/WorkGraphContext";
import { useOnboardingResources } from "../../hooks/useOnboardingResources";
import { useResourceLibrary } from "../../hooks/useResourceLibrary";
import { ResourceLibrary } from "../onboarding/ResourceLibrary";
import { isNewStarter } from "../../domain/onboarding/newStarter";
import { Button } from "../../components/Button/Button";
import { ProjectContextSection } from "./ProjectContextSection";
import { PersonPerformanceMetrics } from "./PersonPerformanceMetrics";
import { EmployeeCurrentWorkList } from "./EmployeeCurrentWorkList";
import { UpcomingTimeOffSection } from "./UpcomingTimeOffSection";
import { buildPreLeaveWorkSummary } from "../../domain/availability/preLeaveWork";
import { summarizeChangesWhileAway } from "../../domain/availability/changedWhileAway";
import { isUpcomingLeaveState } from "../../domain/availability/leaveCalendar";
import { PerformanceStatusBanner } from "./PerformanceStatusBanner";
import { EmployeeGoalsView } from "./EmployeeGoalsView";
import "./goal-detail-drawer.css";
import { buildMetricDrilldownRequest } from "./analyticsDrilldownModel";
import "../../components/KpiCard/kpi-card.css";
import "./performance-dashboard.css";

export interface EmployeePerformanceOverviewProps {
  personId: string;
}

function sortCurrentWorkRows(rows: PersonWorkRowData[]): PersonWorkRowData[] {
  const rank = (item: PersonWorkRowData) => {
    if (item.healthVariant === "danger") return 0;
    if (item.healthVariant === "warning") return 1;
    if (/review/i.test(item.status)) return 2;
    if (/progress/i.test(item.status)) return 3;
    return 4;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

export function EmployeePerformanceOverview({ personId }: EmployeePerformanceOverviewProps) {
  const [activeView, setActiveView] = useState<EmployeePerformanceView>(
    () => readPersistedEmployeePerformanceView(),
  );
  const paintedView = usePaintedSelection(activeView);
  const { viewModels, status, data } = usePerformanceData();
  const analytics = useOptionalPerformanceAnalytics();
  const { openPerson } = usePersonNavigation();
  const selfPerson = useMemo(
    () => data?.teamSnapshot.persons.find((person) => person.id === personId),
    [data, personId],
  );
  const selfBamboo = selfPerson?.bamboo;
  const graph = useWorkGraph();
  const knowledgeLinks = useMemo(
    () => [...graph.knowledgeByIssue.values()].flat().concat([...graph.knowledgeByProject.values()].flat()),
    [graph.knowledgeByIssue, graph.knowledgeByProject],
  );
  const onboardingMatched = useOnboardingResources({
    department: selfBamboo?.department,
    jobTitle: selfBamboo?.jobTitle,
    projects: graph.projects,
    knowledgeLinks,
  });
  const resourceLibrary = useResourceLibrary();
  const { registerEmployeeView } = usePerformanceExport();

  const workspace = viewModels?.getPersonAnalytics(personId);
  const snapshot = viewModels?.employee;

  const focusItems = useMemo(() => {
    if (!workspace || !snapshot) return [];
    return buildEmployeeFocusActions({
      workspace,
      myWeek: snapshot.myWeek,
      selfPersonId: personId,
    });
  }, [workspace, snapshot, personId]);

  const handleFocusAction = (item: import("../../domain/actions/actionTypes").ActionItem) => {
    navigateActionTarget(item.target, {
      openPerson,
    });
  };
  useEffect(() => {
    registerEmployeeView(activeView);
  }, [activeView, registerEmployeeView]);

  useEffect(() => {
    const handler = (event: Event) => {
      const view = (event as CustomEvent<EmployeePerformanceView>).detail;
      if (view) {
        writePersistedEmployeePerformanceView(view);
        setActiveView(view);
      }
    };
    window.addEventListener("metrio-open-employee-view", handler);
    return () => window.removeEventListener("metrio-open-employee-view", handler);
  }, []);

  const currentWork = useMemo(() => {
    if (!workspace) return [];
    const combined = [
      ...workspace.problematicWork,
      ...workspace.workRows.filter(
        (row) => !workspace.problematicWork.some((p) => p.key === row.key),
      ),
    ];
    return sortCurrentWorkRows(combined).slice(0, 16);
  }, [workspace]);

  const preLeave = useMemo(() => {
    if (!selfPerson || !data?.reportParams) return null;
    if (!isUpcomingLeaveState(selfPerson.availability.state)) return null;
    return buildPreLeaveWorkSummary(selfPerson, data.reportParams, 5);
  }, [selfPerson, data?.reportParams]);

  const returnSummary = useMemo(() => {
    if (!selfPerson?.availability.startDate || !selfPerson.availability.endDate) {
      return null;
    }
    return summarizeChangesWhileAway(
      selfPerson,
      selfPerson.availability.startDate,
      selfPerson.availability.endDate,
    );
  }, [selfPerson]);

  const openMetricDrilldown = analytics
    ? (metric: MetricCardData, source: HTMLElement) => {
        if (!workspace) return;
        const request = buildMetricDrilldownRequest(metric, {
          personId: workspace.personId,
          personDisplayName: workspace.personName,
        });
        if (!request) return;
        analytics.openPersonAnalyticsDrilldown(
          workspace.personId,
          request,
          source,
          metric,
        );
      }
    : undefined;

  if (!snapshot && (status === "loading" || status === "idle")) {
    return (
      <div className="performance-dashboard">
        <PerformanceStatusBanner />
      </div>
    );
  }

  if (!snapshot || !workspace) {
    return (
      <div className="performance-dashboard">
        <PerformanceStatusBanner />
        <div className="performance-empty" role="status">
          No Jira work found for this period.
        </div>
      </div>
    );
  }

  return (
    <div
      className="performance-dashboard"
      data-testid="performance-dashboard-ready"
    >
      <PerformanceStatusBanner />
      <EmployeePerformanceSubnav
        activeView={activeView}
        onChange={(view) => {
          markPerformanceTabSwitch(view);
          writePersistedEmployeePerformanceView(view);
          setActiveView(view);
        }}
      />

      {paintedView === "overview" ? (
        <section
          aria-label="Performance overview"
          data-testid="performance-view-overview"
        >
          <p className="performance-employee-context">{workspace.contextLine}</p>

          {selfBamboo && selfBamboo.hireDate && isNewStarter(selfBamboo.hireDate) ? (
            <GettingStartedSection
              bamboo={selfBamboo}
              matched={onboardingMatched}
              onViewAllResources={resourceLibrary.openLibrary}
            />
          ) : null}
          {selfBamboo && (!selfBamboo.hireDate || !isNewStarter(selfBamboo.hireDate)) ? (
            <section className="performance-section" aria-label="Resources">
              <h3 className="performance-section__title">Resources</h3>
              <p className="performance-inline-empty">
                {onboardingMatched.preview.length} recommended links for your role
              </p>
              <Button variant="secondary" onClick={resourceLibrary.openLibrary}>
                Open resource library
              </Button>
            </section>
          ) : null}

          <ProjectContextSection />

          <ActionQueueSection
            title="My focus"
            items={focusItems}
            emptyMessage="Nothing needs your attention right now."
            onOpen={handleFocusAction}
            openLabel={actionOpenLabel}
            footerAction={{
              label: "View all work",
              onClick: () => {
                writePersistedEmployeePerformanceView("my-week");
                setActiveView("my-week");
              },
            }}
          />

          <h3 className="performance-section__title">Performance</h3>
          <PersonPerformanceMetrics
            kpis={snapshot.metrics}
            cycleTime={snapshot.cycleTime}
            onOpenMetric={openMetricDrilldown}
          />

          <h3 className="performance-section__title">Current work</h3>
          {currentWork.length === 0 ? (
            <p className="performance-inline-empty">No active work in this period.</p>
          ) : (
            <EmployeeCurrentWorkList rows={currentWork} />
          )}

          <h3 className="performance-section__title">Needs attention</h3>
          <GroupedAttentionList items={snapshot.attention} />

          {selfPerson ? (
            <UpcomingTimeOffSection
              person={selfPerson}
              timeOff={snapshot.timeOff}
              preLeave={preLeave}
              returnSummary={returnSummary}
              onViewAllWork={() => {
                writePersistedEmployeePerformanceView("my-week");
                setActiveView("my-week");
              }}
            />
          ) : null}
        </section>
      ) : null}

      {paintedView === "my-week" ? (
        <div data-testid="performance-view-my-week">
          <EmployeeMyWeekView myWeek={snapshot.myWeek} />
        </div>
      ) : null}

      {paintedView === "goals" ? (
        <div data-testid="performance-view-goals">
          <EmployeeGoalsView personId={personId} />
        </div>
      ) : null}

      {paintedView === "trends" ? (
        <div data-testid="performance-view-trends">
          <EmployeeTrendsView
            trends={snapshot.trends}
            personId={workspace.personId}
            personDisplayName={workspace.personName}
          />
        </div>
      ) : null}

      {paintedView === "work-history" ? (
        <div data-testid="performance-view-work-history">
          <EmployeeWorkHistoryView
            personId={workspace.personId}
            personName={workspace.personName}
            historyWeek={snapshot.historyWeek}
            historyMonth={snapshot.historyMonth}
            historyQuarter={snapshot.historyQuarter}
          />
        </div>
      ) : null}
      <ResourceLibrary
        open={resourceLibrary.open}
        onClose={resourceLibrary.closeLibrary}
        resources={onboardingMatched.all}
        byGroup={onboardingMatched.byGroup}
      />
    </div>
  );
}
