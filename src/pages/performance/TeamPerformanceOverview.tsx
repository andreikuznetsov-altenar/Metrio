import { useEffect, useState } from "react";
import type { TeamPerformanceView } from "../../domain/performance";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { usePerformanceExport } from "../../app/PerformanceExportContext";
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
import "./performance-dashboard.css";

export interface TeamPerformanceOverviewProps {
  onOpenPerson: (personId: string) => void;
}

export function TeamPerformanceOverview({
  onOpenPerson,
}: TeamPerformanceOverviewProps) {
  const [activeView, setActiveView] = useState<TeamPerformanceView>("overview");
  const { viewModels, uiState } = usePerformanceData();
  const { registerTeamView } = usePerformanceExport();

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

  if (visualForceSkeleton || uiState === "initial-loading") {
    return (
      <div className="performance-dashboard" data-testid="performance-dashboard-skeleton">
        <TeamPerformanceSubnav activeView={activeView} onChange={setActiveView} />
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
      <TeamPerformanceSubnav activeView={activeView} onChange={setActiveView} />

      {activeView === "overview" ? (
        <TeamOverviewView
          snapshot={snapshot}
          onOpenPerson={onOpenPerson}
          onViewAllRadar={() => setActiveView("radar")}
        />
      ) : null}

      {activeView === "people" ? (
        <TeamPeopleView rows={secondary.people} onOpenPerson={onOpenPerson} />
      ) : null}

      {activeView === "radar" ? (
        <TeamRadarView rows={secondary.radar} onOpenPerson={onOpenPerson} />
      ) : null}

      {activeView === "delivery-risk" ? (
        <TeamDeliveryRiskView
          rows={secondary.deliveryRisk}
          onOpenPerson={onOpenPerson}
        />
      ) : null}
    </div>
  );
}
