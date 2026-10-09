import { memo, useCallback, useEffect, useSyncExternalStore } from "react";
import type {
  MetricCardData,
  PerformanceReviewTarget,
  TeamPerformanceSnapshot,
  TeamPerformanceView,
  TeamSecondarySnapshot,
  TrendCardData,
} from "../../domain/performance";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { appNavigate, getAppNavigationState, subscribeAppNavigation } from "../../app/navigationStore";
import {
  markPerformanceTabContent,
  markPerformanceTabSwitch,
  usePaintedSelection,
} from "./useKeepMountedView";
import { usePerformanceExport } from "../../app/PerformanceExportContext";
import {
  usePerformanceAnalytics,
  type PersonDrawerTab,
} from "../../app/performanceAnalyticsContext";
import { TeamDeliveryRiskView } from "./TeamDeliveryRiskView";
import { TeamOverviewView } from "./TeamOverviewView";
import { TeamPeopleView } from "./TeamPeopleView";
import { TeamPerformanceSubnav } from "./TeamPerformanceSubnav";
import { TeamRadarView } from "./TeamRadarView";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { EmployeeGoalsView } from "./EmployeeGoalsView";
import { HistoryReportsView } from "./HistoryReportsView";
import "./goal-detail-drawer.css";
import { PerformanceStatusBanner } from "./PerformanceStatusBanner";
import { WorkspaceContentLoadingState } from "../../components/WorkspaceContentLoading/WorkspaceContentLoadingState";
import {
  PerformanceOverviewSkeleton,
  PerformanceTableSkeleton,
} from "./PerformanceSkeletons";
import "../../components/KpiCard/kpi-card.css";
import "./performance-dashboard.css";

export interface TeamPerformanceOverviewProps {
  onOpenPerson: (personId: string, tab?: PersonDrawerTab) => void;
  reviewTarget: PerformanceReviewTarget;
}

export function TeamPerformanceOverview({
  onOpenPerson,
  reviewTarget,
}: TeamPerformanceOverviewProps) {
  const requestedView = useSyncExternalStore(
    subscribeAppNavigation,
    () => getAppNavigationState().performanceView,
    () => getAppNavigationState().performanceView,
  );
  const paintedView = usePaintedSelection(requestedView);
  const { viewModels, uiState } = usePerformanceData();
  const { currentUser } = useCurrentUser();
  const { registerTeamView } = usePerformanceExport();
  const { openTeamMetricDrilldown, openTeamTrendDrilldown } =
    usePerformanceAnalytics();

  const handleOpenPerson = useCallback(
    (personId: string, tab?: PersonDrawerTab) => {
      onOpenPerson(personId, tab);
    },
    [onOpenPerson],
  );

  const selectTeamView = useCallback((view: TeamPerformanceView) => {
    markPerformanceTabSwitch(view);
    appNavigate({ performanceView: view });
  }, []);

  const visualForceSkeleton =
    import.meta.env.VITE_VISUAL_FIXTURE === "1" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("visualSkeleton") === "1";

  useEffect(() => {
    registerTeamView(requestedView);
  }, [requestedView, registerTeamView]);

  useEffect(() => {
    if (paintedView) {
      markPerformanceTabContent(paintedView);
    }
  }, [paintedView]);

  void reviewTarget;

  const openMetricDrilldown = useCallback(
    (metric: MetricCardData, source: HTMLElement) => {
      openTeamMetricDrilldown(metric, source);
    },
    [openTeamMetricDrilldown],
  );

  const openTrendDrilldown = useCallback(
    (
      trend: TrendCardData,
      point: { date: string; value: number },
      source: HTMLElement | null,
    ) => {
      openTeamTrendDrilldown(trend, point, source);
    },
    [openTeamTrendDrilldown],
  );

  const selectRadar = useCallback(() => {
    selectTeamView("radar");
  }, [selectTeamView]);

  if (uiState === "initial-loading") {
    return (
      <div className="performance-dashboard" data-testid="performance-dashboard-loading">
        <WorkspaceContentLoadingState
          title="Loading performance data…"
          body="Fetching team metrics and workload."
          testId="performance-initial-loading"
        />
      </div>
    );
  }

  if (visualForceSkeleton) {
    return (
      <div className="performance-dashboard" data-testid="performance-dashboard-skeleton">
        <TeamPerformanceSubnav
          activeView={requestedView}
          onChange={selectTeamView}
        />
        {requestedView === "overview" ? <PerformanceOverviewSkeleton /> : null}
        {requestedView === "people" ? <PerformanceTableSkeleton rows={6} columns={5} /> : null}
        {requestedView === "radar" ? <PerformanceTableSkeleton rows={6} columns={4} /> : null}
        {requestedView === "delivery-risk" ? (
          <PerformanceTableSkeleton rows={6} columns={5} />
        ) : null}
      </div>
    );
  }

  if (uiState === "error" && !viewModels) {
    return (
      <div className="performance-dashboard">
        <PerformanceStatusBanner />
      </div>
    );
  }

  if (!viewModels) {
    return (
      <div className="performance-dashboard">
        <PerformanceStatusBanner />
      </div>
    );
  }

  const snapshot = viewModels.teamOverview;
  const secondary = viewModels.teamSecondary;

  return (
    <div
      className="performance-dashboard"
      data-testid="performance-dashboard-ready"
    >
      <PerformanceStatusBanner />
      <TeamPerformanceSubnav
        activeView={requestedView}
        onChange={selectTeamView}
      />
      <TeamPerformancePaintedBody
        paintedView={paintedView}
        snapshot={snapshot}
        secondary={secondary}
        ownPersonId={currentUser.person.id}
        onOpenPerson={handleOpenPerson}
        onSelectRadar={selectRadar}
        onOpenMetricDrilldown={openMetricDrilldown}
        onOpenTrendDrilldown={openTrendDrilldown}
      />
    </div>
  );
}

const TeamPerformancePaintedBody = memo(
  function TeamPerformancePaintedBody({
    paintedView,
    snapshot,
    secondary,
    ownPersonId,
    onOpenPerson,
    onSelectRadar,
    onOpenMetricDrilldown,
    onOpenTrendDrilldown,
  }: {
    paintedView: TeamPerformanceView | null;
    snapshot: TeamPerformanceSnapshot;
    secondary: TeamSecondarySnapshot;
    ownPersonId: string;
    onOpenPerson: (personId: string, tab?: PersonDrawerTab) => void;
    onSelectRadar: () => void;
    onOpenMetricDrilldown: (metric: MetricCardData, source: HTMLElement) => void;
    onOpenTrendDrilldown: (
      trend: TrendCardData,
      point: { date: string; value: number },
      source: HTMLElement | null,
    ) => void;
  }) {
    return (
      <>
        {paintedView === "overview" ? (
          <div data-testid="performance-view-overview">
            <TeamOverviewView
              snapshot={snapshot}
              secondary={secondary}
              onOpenPerson={onOpenPerson}
              onViewAllRadar={onSelectRadar}
              onOpenMetricDrilldown={onOpenMetricDrilldown}
              onOpenTrendDrilldown={onOpenTrendDrilldown}
            />
          </div>
        ) : null}
        {paintedView === "people" ? (
          <div data-testid="performance-view-people">
            <TeamPeopleView rows={secondary.people} onOpenPerson={onOpenPerson} />
          </div>
        ) : null}
        {paintedView === "radar" ? (
          <div data-testid="performance-view-radar">
            <TeamRadarView rows={secondary.radar} onOpenPerson={onOpenPerson} />
          </div>
        ) : null}
        {paintedView === "delivery-risk" ? (
          <div data-testid="performance-view-delivery-risk">
            <TeamDeliveryRiskView rows={secondary.deliveryRisk} onOpenPerson={onOpenPerson} />
          </div>
        ) : null}
        {paintedView === "goals" ? (
          <div data-testid="performance-view-goals">
            {/* Bamboo is canonical; legacy ManagerGoalsView is not rendered */}
            <EmployeeGoalsView personId={ownPersonId} />
          </div>
        ) : null}
        {paintedView === "history-reports" ? (
          <div data-testid="performance-view-history-reports">
            <HistoryReportsView />
          </div>
        ) : null}
      </>
    );
  },
  (prev, next) =>
    prev.paintedView === next.paintedView &&
    prev.snapshot === next.snapshot &&
    prev.secondary === next.secondary &&
    prev.ownPersonId === next.ownPersonId,
);
