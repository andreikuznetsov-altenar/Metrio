import { useEffect, useMemo, useState } from "react";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useOptionalPerformanceAnalytics } from "../../app/performanceAnalyticsContext";
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
import { PersonAnalyticsMetricGrid } from "./PersonAnalyticsMetricGrid";
import { PersonWorkRow } from "./PersonWorkRow";
import { PerformanceStatusBanner } from "./PerformanceStatusBanner";
import { buildMetricDrilldownRequest } from "./analyticsDrilldownModel";
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
  const { viewModels, status } = usePerformanceData();
  const analytics = useOptionalPerformanceAnalytics();
  const { registerEmployeeView } = usePerformanceExport();

  useEffect(() => {
    registerEmployeeView(activeView);
  }, [activeView, registerEmployeeView]);

  const workspace = viewModels?.getPersonAnalytics(personId);
  const snapshot = viewModels?.employee;

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
          writePersistedEmployeePerformanceView(view);
          setActiveView(view);
        }}
      />

      {activeView === "overview" ? (
        <section aria-label="Performance overview">
          <p className="performance-employee-context">{workspace.contextLine}</p>

          <h3 className="performance-section__title">Performance</h3>
          <PersonAnalyticsMetricGrid
            metrics={snapshot.metrics}
            onOpenMetric={openMetricDrilldown}
          />

          <h3 className="performance-section__title">Current work</h3>
          {currentWork.length === 0 ? (
            <p className="performance-inline-empty">No active work in this period.</p>
          ) : (
            <div className="performance-work-list">
              {currentWork.map((item) => (
                <PersonWorkRow key={item.key} item={item} />
              ))}
            </div>
          )}

          <h3 className="performance-section__title">Needs attention</h3>
          <GroupedAttentionList items={snapshot.attention} />

          <h3 className="performance-section__title">Upcoming time off</h3>
          {snapshot.timeOff ? (
            <div className="performance-timeoff-compact">
              <div className="performance-timeoff-compact__range">
                {snapshot.timeOff.rangeLabel}
              </div>
              {snapshot.timeOff.note ? (
                <div className="performance-timeoff-compact__note">
                  {snapshot.timeOff.note}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="performance-inline-empty">No upcoming time off.</p>
          )}
        </section>
      ) : null}

      {activeView === "my-week" ? (
        <EmployeeMyWeekView myWeek={snapshot.myWeek} />
      ) : null}

      {activeView === "trends" ? (
        <EmployeeTrendsView
          trends={snapshot.trends}
          personId={workspace.personId}
          personDisplayName={workspace.personName}
        />
      ) : null}

      {activeView === "work-history" ? (
        <EmployeeWorkHistoryView
          personId={workspace.personId}
          personName={workspace.personName}
          historyWeek={snapshot.historyWeek}
          historyMonth={snapshot.historyMonth}
          historyQuarter={snapshot.historyQuarter}
        />
      ) : null}
    </div>
  );
}
