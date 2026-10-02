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
import { buildEmployeeFocusActions } from "../../domain/actions/buildEmployeeFocus";
import {
  actionOpenLabel,
  navigateActionTarget,
} from "../../app/actionNavigation";
import { ActionQueueSection } from "./ActionQueueSection";
import { GettingStartedSection } from "./GettingStartedSection";
import { PersonPerformanceMetrics } from "./PersonPerformanceMetrics";
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
  const { viewModels, status, data } = usePerformanceData();
  const analytics = useOptionalPerformanceAnalytics();
  const selfBamboo = useMemo(
    () => data?.teamSnapshot.persons.find((person) => person.id === personId)?.bamboo,
    [data, personId],
  );
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
      openPerson: (id, tab) => analytics?.openPersonDrawer({ personId: id, tab }),
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

          {selfBamboo ? <GettingStartedSection bamboo={selfBamboo} /> : null}

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
