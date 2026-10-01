import { useMemo, useState } from "react";
import type {
  DateRangeKey,
  ReviewTargetKey,
  TeamPerformanceView,
} from "../../domain/performance";
import {
  getTeamPerformanceSnapshot,
  getTeamSecondarySnapshot,
} from "../../fixtures/teamPerformance";
import { TeamDeliveryRiskView } from "./TeamDeliveryRiskView";
import { TeamOverviewView } from "./TeamOverviewView";
import { TeamPeopleView } from "./TeamPeopleView";
import { TeamPerformanceSubnav } from "./TeamPerformanceSubnav";
import { TeamRadarView } from "./TeamRadarView";
import "./performance-dashboard.css";

export interface TeamPerformanceOverviewProps {
  directReportIds: string[];
  dateRange: DateRangeKey;
  reviewTarget: ReviewTargetKey;
  refreshToken: number;
  onOpenPerson: (personId: string) => void;
}

export function TeamPerformanceOverview({
  directReportIds,
  dateRange,
  reviewTarget,
  refreshToken,
  onOpenPerson,
}: TeamPerformanceOverviewProps) {
  const [activeView, setActiveView] = useState<TeamPerformanceView>("overview");

  const snapshot = useMemo(
    () =>
      getTeamPerformanceSnapshot(
        directReportIds,
        dateRange,
        reviewTarget,
        refreshToken,
      ),
    [directReportIds, dateRange, reviewTarget, refreshToken],
  );

  const secondary = useMemo(
    () =>
      getTeamSecondarySnapshot(
        directReportIds,
        dateRange,
        reviewTarget,
        refreshToken,
      ),
    [directReportIds, dateRange, reviewTarget, refreshToken],
  );

  return (
    <div className="performance-dashboard">
      <TeamPerformanceSubnav activeView={activeView} onChange={setActiveView} />

      {activeView === "overview" ? (
        <TeamOverviewView snapshot={snapshot} onOpenPerson={onOpenPerson} />
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
