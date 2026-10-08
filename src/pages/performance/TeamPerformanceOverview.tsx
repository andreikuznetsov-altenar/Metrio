import { useCallback, useEffect, useLayoutEffect, useState, startTransition } from "react";
import { registerTeamPerformanceViewHandler } from "../../app/appNavigation";
import type { TeamPerformanceView } from "../../domain/performance";
import type { PerformanceReviewTarget } from "../../domain/performance";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import {
  consumePendingTeamPerformanceView,
  readIntendedTeamPerformanceView,
  writePersistedTeamPerformanceView,
} from "../../app/performanceViewPersistence";
import { markPerformanceTabSwitch, useKeepMountedView } from "./useKeepMountedView";
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
import { ManagerGoalsView } from "./ManagerGoalsView";
import { HistoryReportsView } from "./HistoryReportsView";
import "./goal-detail-drawer.css";
import { PerformanceStatusBanner } from "./PerformanceStatusBanner";
import { WorkspaceContentLoadingState } from "../../components/WorkspaceContentLoading/WorkspaceContentLoadingState";
import {
  PerformanceOverviewSkeleton,
  PerformanceTableSkeleton,
} from "./PerformanceSkeletons";
import type { MetricCardData, TrendCardData } from "../../domain/performance";
import "./performance-dashboard.css";

export interface TeamPerformanceOverviewProps {
  onOpenPerson: (personId: string, tab?: PersonDrawerTab) => void;
  reviewTarget: PerformanceReviewTarget;
}

export function TeamPerformanceOverview({
  onOpenPerson,
  reviewTarget,
}: TeamPerformanceOverviewProps) {
  const [activeView, setActiveView] = useState<TeamPerformanceView>(
    () => readIntendedTeamPerformanceView(),
  );
  const mountedViews = useKeepMountedView(activeView);
  const { viewModels, uiState } = usePerformanceData();
  const { registerTeamView } = usePerformanceExport();
  const { openTeamMetricDrilldown, openTeamTrendDrilldown } =
    usePerformanceAnalytics();

  const handleOpenPerson = (personId: string, tab?: PersonDrawerTab) => {
    onOpenPerson(personId, tab);
  };

  const selectTeamView = useCallback((view: TeamPerformanceView) => {
    markPerformanceTabSwitch(view);
    startTransition(() => {
      setActiveView(view);
    });
    queueMicrotask(() => writePersistedTeamPerformanceView(view));
  }, []);

  const visualForceSkeleton =
    import.meta.env.VITE_VISUAL_FIXTURE === "1" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("visualSkeleton") === "1";

  useEffect(() => {
    registerTeamView(activeView);
  }, [activeView, registerTeamView]);

  useLayoutEffect(() => {
    const pending = consumePendingTeamPerformanceView();
    if (pending) {
      markPerformanceTabSwitch(pending);
      setActiveView(pending);
      queueMicrotask(() => writePersistedTeamPerformanceView(pending));
    }
  }, []);

  useEffect(() => {
    registerTeamPerformanceViewHandler(selectTeamView);
    return () => registerTeamPerformanceViewHandler(null);
  }, [selectTeamView]);

  useEffect(() => {
    const handler = (event: Event) => {
      const tab = (event as CustomEvent<TeamPerformanceView>).detail;
      if (tab) {
        selectTeamView(tab);
      }
    };
    window.addEventListener("metrio-open-performance-tab", handler);
    return () => window.removeEventListener("metrio-open-performance-tab", handler);
  }, [selectTeamView]);

  void reviewTarget;

  const openMetricDrilldown = (metric: MetricCardData, source: HTMLElement) => {
    openTeamMetricDrilldown(metric, source);
  };

  const openTrendDrilldown = (
    trend: TrendCardData,
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => {
    openTeamTrendDrilldown(trend, point, source);
  };

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
          activeView={activeView}
          onChange={selectTeamView}
        />
        {activeView === "overview" ? <PerformanceOverviewSkeleton /> : null}
        {activeView === "people" ? <PerformanceTableSkeleton rows={6} columns={5} /> : null}
        {activeView === "radar" ? <PerformanceTableSkeleton rows={6} columns={4} /> : null}
        {activeView === "delivery-risk" ? (
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
        activeView={activeView}
        onChange={selectTeamView}
      />

      {mountedViews.includes("overview") ? (
        <div hidden={activeView !== "overview"} data-testid="performance-view-overview">
          <TeamOverviewView
            snapshot={snapshot}
            secondary={secondary}
            onOpenPerson={handleOpenPerson}
            onViewAllRadar={() => selectTeamView("radar")}
            onOpenMetricDrilldown={openMetricDrilldown}
            onOpenTrendDrilldown={openTrendDrilldown}
          />
        </div>
      ) : null}

      {mountedViews.includes("people") ? (
        <div hidden={activeView !== "people"} data-testid="performance-view-people">
          <TeamPeopleView rows={secondary.people} onOpenPerson={handleOpenPerson} />
        </div>
      ) : null}

      {mountedViews.includes("radar") ? (
        <div hidden={activeView !== "radar"} data-testid="performance-view-radar">
          <TeamRadarView rows={secondary.radar} onOpenPerson={handleOpenPerson} />
        </div>
      ) : null}

      {mountedViews.includes("delivery-risk") ? (
        <div hidden={activeView !== "delivery-risk"} data-testid="performance-view-delivery-risk">
          <TeamDeliveryRiskView rows={secondary.deliveryRisk} onOpenPerson={handleOpenPerson} />
        </div>
      ) : null}

      {mountedViews.includes("goals") ? (
        <div hidden={activeView !== "goals"} data-testid="performance-view-goals">
          <ManagerGoalsView />
        </div>
      ) : null}

      {mountedViews.includes("history-reports") ? (
        <div hidden={activeView !== "history-reports"} data-testid="performance-view-history-reports">
          <HistoryReportsView />
        </div>
      ) : null}
    </div>
  );
}
