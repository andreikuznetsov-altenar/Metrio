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
import "./performance-dashboard.css";

export interface TeamPerformanceOverviewProps {
  onOpenPerson: (personId: string) => void;
}

export function TeamPerformanceOverview({
  onOpenPerson,
}: TeamPerformanceOverviewProps) {
  const [activeView, setActiveView] = useState<TeamPerformanceView>("overview");
  const { viewModels, status } = usePerformanceData();
  const { registerTeamView } = usePerformanceExport();

  useEffect(() => {
    registerTeamView(activeView);
  }, [activeView, registerTeamView]);

  if (!viewModels && (status === "loading" || status === "idle")) {
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
        <TeamRadarView rows={secondary.radar} />
      ) : null}

      {activeView === "delivery-risk" ? (
        <TeamDeliveryRiskView rows={secondary.deliveryRisk} />
      ) : null}
    </div>
  );
}
