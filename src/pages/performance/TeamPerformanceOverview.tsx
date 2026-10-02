import { useEffect, useState } from "react";
import type { TeamPerformanceView } from "../../domain/performance";
import type { PerformanceReviewTarget } from "../../domain/performance";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import {
  readPersistedTeamPerformanceView,
  writePersistedTeamPerformanceView,
} from "../../app/performanceViewPersistence";
import { usePerformanceExport } from "../../app/PerformanceExportContext";
import { usePerformanceAnalytics } from "../../app/performanceAnalyticsContext";
import { TeamDeliveryRiskView } from "./TeamDeliveryRiskView";
import { TeamOverviewView } from "./TeamOverviewView";
import { TeamPeopleView } from "./TeamPeopleView";
import { TeamPerformanceSubnav } from "./TeamPerformanceSubnav";
import { TeamRadarView } from "./TeamRadarView";
import { PerformanceStatusBanner } from "./PerformanceStatusBanner";
import {
  PerformanceOverviewSkeleton,
  PerformanceTableSkeleton,
} from "./PerformanceSkeletons";
import type { MetricCardData, TrendCardData } from "../../domain/performance";
import "./performance-dashboard.css";

export interface TeamPerformanceOverviewProps {
  onOpenPerson: (personId: string) => void;
  reviewTarget: PerformanceReviewTarget;
}

export function TeamPerformanceOverview({
  onOpenPerson,
  reviewTarget,
}: TeamPerformanceOverviewProps) {
  const [activeView, setActiveView] = useState<TeamPerformanceView>(
    () => readPersistedTeamPerformanceView(),
  );
  const { viewModels, uiState } = usePerformanceData();
  const { registerTeamView } = usePerformanceExport();
  const { openTeamMetricDrilldown, openTeamTrendDrilldown } = usePerformanceAnalytics();

  const visualForceSkeleton =
    import.meta.env.VITE_VISUAL_FIXTURE === "1" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("visualSkeleton") === "1";

  useEffect(() => {
    registerTeamView(activeView);
  }, [activeView, registerTeamView]);

  useEffect(() => {
    const handler = (event: Event) => {
      const tab = (event as CustomEvent<TeamPerformanceView>).detail;
      if (tab) {
        setActiveView(tab);
      }
    };
    window.addEventListener("metrio-open-performance-tab", handler);
    return () => window.removeEventListener("metrio-open-performance-tab", handler);
  }, []);

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

  if (visualForceSkeleton || uiState === "initial-loading") {
    return (
      <div className="performance-dashboard" data-testid="performance-dashboard-skeleton">
        <TeamPerformanceSubnav
          activeView={activeView}
          onChange={(view) => {
            writePersistedTeamPerformanceView(view);
            setActiveView(view);
          }}
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
        onChange={(view) => {
          writePersistedTeamPerformanceView(view);
          setActiveView(view);
        }}
      />

      {activeView === "overview" ? (
        <TeamOverviewView
          snapshot={snapshot}
          secondary={secondary}
          onOpenPerson={onOpenPerson}
          onViewAllRadar={() => setActiveView("radar")}
          onOpenMetricDrilldown={openMetricDrilldown}
          onOpenTrendDrilldown={openTrendDrilldown}
        />
      ) : null}

      {activeView === "people" ? (
        <TeamPeopleView rows={secondary.people} onOpenPerson={onOpenPerson} />
      ) : null}

      {activeView === "radar" ? (
        <TeamRadarView rows={secondary.radar} onOpenPerson={onOpenPerson} />
      ) : null}

      {activeView === "delivery-risk" ? (
        <TeamDeliveryRiskView rows={secondary.deliveryRisk} onOpenPerson={onOpenPerson} />
      ) : null}
    </div>
  );
}
