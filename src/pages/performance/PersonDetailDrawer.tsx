import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/Button/Button";
import { DrawerPanelPlaceholder } from "../../components/Drawer/DrawerPanelPlaceholder";
import { DrawerStack } from "../../components/Drawer/DrawerStack";
import { Select } from "../../components/Select/Select";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { Tabs } from "../../components/Tabs/Tabs";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useOptionalPerformanceIssueCatalog } from "../../app/PerformanceIssueCatalogContext";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { canOpenPersonBrief } from "../../domain/personAccess";
import { useOnboardingResources } from "../../hooks/useOnboardingResources";
import { ManagerNewStarterContext } from "../onboarding/ManagerNewStarterContext";
import {
  useOptionalPerformanceAnalytics,
  type PersonDrawerTab,
  type PersonDrawerView,
} from "../../app/performanceAnalyticsContext";
import { PersonBriefDrawerPanel } from "./PersonBriefDrawer";
import type { WorkHistoryRow } from "../../domain/performance";
import {
  formatWorkHistoryGroupLabel,
  formatWorkHistoryGroupSummary,
} from "../../domain/personal/workHistoryDisplay";
import { groupAttentionSignals } from "./groupAttentionSignals";
import { AttentionSignalsTable } from "./AttentionSignalsTable";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { PersonWorkRow } from "./PersonWorkRow";
import { PersonIdentityHeader } from "./PersonIdentityHeader";
import { PersonPerformanceMetrics } from "./PersonPerformanceMetrics";
import { TrendInsufficientHistory, TrendMiniChart } from "./TrendMiniChart";
import { TrendValue } from "./TrendValue";
import { readDashboardVisualQueryFlag } from "../../fixtures/dashboardVisualOverrides";
import {
  buildMetricDrilldownRequest,
  buildTrendDrilldownRequest,
} from "./analyticsDrilldownModel";
import "./person-detail-drawer.css";
import "./person-identity-header.css";
import "./person-work-card.css";
import "./performance-dashboard.css";

const HISTORY_PAGE_SIZE = 15;

export interface PersonDetailDrawerProps {
  personId: string;
  open: boolean;
  activeTab?: PersonDrawerTab;
  onTabChange?: (tab: PersonDrawerTab) => void;
  /** Profile | Brief — same drawer shell, content only. */
  activeView?: PersonDrawerView;
  onViewChange?: (view: PersonDrawerView) => void;
  prepForOneOnOne?: boolean;
  onClose: () => void;
  onClosed?: () => void;
}

type HistoryPeriod = "week" | "month" | "quarter";
type HistoryFilter = "all" | "first_pass" | "rework";

function rowMatchesFilter(row: WorkHistoryRow, filter: HistoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "first_pass") return /first pass/i.test(row.outcome);
  return /rework/i.test(row.outcome);
}

function historyRowToWorkItem(row: WorkHistoryRow): import("../../domain/analytics/personAnalyticsWorkspace").PersonWorkRowData {
  const firstPass = /first pass/i.test(row.outcome);
  return {
    key: row.key,
    title: row.title,
    status: row.outcome,
    stageAge: row.completedOn,
    healthVariant: firstPass ? "success" : "warning",
    footMeta: `${row.completedOn} · ${row.cycle}`,
  };
}

export function PersonDetailDrawer({
  personId,
  open,
  activeTab = "overview",
  onTabChange,
  activeView: activeViewProp,
  onViewChange,
  prepForOneOnOne = false,
  onClose,
  onClosed,
}: PersonDetailDrawerProps) {
  const { viewModels, data: performanceData } = usePerformanceData();
  const issueCatalog = useOptionalPerformanceIssueCatalog();
  const teamPersons = performanceData?.teamSnapshot.persons ?? [];
  const { currentUser } = useCurrentUser();
  const analytics = useOptionalPerformanceAnalytics();
  const person = viewModels?.getPerson(personId);
  const workspace = viewModels?.getPersonAnalytics(personId);
  const isDirectReport = Boolean(
    currentUser.team?.directReportIds.includes(personId) &&
      personId !== currentUser.person.id,
  );
  const showBriefAction = canOpenPersonBrief(currentUser, personId);
  const managerOnboarding = useOnboardingResources({
    department: person?.bamboo.department,
    jobTitle: person?.bamboo.jobTitle,
    projects: [],
    knowledgeLinks: [],
  });
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("month");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyVisibleCount, setHistoryVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [internalView, setInternalView] = useState<PersonDrawerView>("profile");
  const [briefMounted, setBriefMounted] = useState(false);
  const activeView = activeViewProp ?? internalView;
  const setActiveView = (view: PersonDrawerView) => {
    if (!showBriefAction && view === "brief") return;
    onViewChange?.(view);
    if (activeViewProp === undefined) setInternalView(view);
  };
  const scrollByView = useRef({ profile: 0, brief: 0 });
  const previousViewRef = useRef<PersonDrawerView>(activeView);

  useEffect(() => {
    if (open) {
      setHistoryVisibleCount(HISTORY_PAGE_SIZE);
    } else if (activeViewProp === undefined) {
      setInternalView("profile");
      setBriefMounted(false);
      scrollByView.current = { profile: 0, brief: 0 };
      previousViewRef.current = "profile";
    }
  }, [open, historyPeriod, historyFilter, activeViewProp]);

  useEffect(() => {
    scrollByView.current = { profile: 0, brief: 0 };
    previousViewRef.current = activeViewProp ?? "profile";
    if (activeViewProp === undefined) {
      setInternalView("profile");
      setBriefMounted(false);
    } else {
      setBriefMounted(activeViewProp === "brief");
    }
  }, [personId, activeViewProp]);

  useEffect(() => {
    if (activeView === "brief" && showBriefAction) {
      setBriefMounted(true);
    }
  }, [activeView, showBriefAction]);

  useLayoutEffect(() => {
    const root = document.querySelector(
      '[data-testid="person-detail-drawer"]',
    );
    const body = root?.querySelector(".drawer__body") as HTMLElement | null;
    if (!body) return;
    const previous = previousViewRef.current;
    if (previous !== activeView) {
      scrollByView.current[previous] = body.scrollTop;
      body.scrollTop = scrollByView.current[activeView] ?? 0;
      previousViewRef.current = activeView;
    }
  }, [activeView]);

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  const groupedAttention = useMemo(() => {
    if (!workspace) return [];
    if (readDashboardVisualQueryFlag("visualGroupedTasks")) {
      const seed = workspace.attention[0] ?? {
        label: "Needs attention",
        variant: "warning" as const,
        reason: "Deterministic grouped-task acceptance fixture.",
      };
      const issueKeys = Array.from(
        new Set(
          [
            seed.issueKey,
            ...(issueCatalog
              ? [...issueCatalog.values()]
                  .filter(
                    (issue) =>
                      Boolean(issue.issueSummary) &&
                      Boolean(issue.issueCreated) &&
                      Boolean(issue.currentStatus) &&
                      issue.events.some((event) => event.eventType === "Status"),
                  )
                  .map((issue) => issue.issueKey)
              : []),
            ...workspace.workRows.map((row) => row.key),
            ...teamPersons.flatMap((teamPerson) =>
              teamPerson.issues.map((issue) => issue.issueKey),
            ),
            ...(issueCatalog ? [...issueCatalog.keys()] : []),
          ].filter((key): key is string => Boolean(key)),
        ),
      ).slice(0, 3);
      const fixtureAttention = [
        ...workspace.attention,
        ...(workspace.attention.length === 0 ? [seed] : []),
        ...issueKeys
          .filter((issueKey) => issueKey !== seed.issueKey)
          .map((issueKey) => ({ ...seed, issueKey })),
      ];
      return groupAttentionSignals(fixtureAttention);
    }
    return groupAttentionSignals(workspace.attention);
  }, [issueCatalog, teamPersons, workspace]);

  const historyGroups = useMemo(() => {
    if (!workspace) return [];
    if (historyPeriod === "week") return workspace.historyWeek;
    if (historyPeriod === "quarter") return workspace.historyQuarter;
    return workspace.historyMonth;
  }, [historyPeriod, workspace]);

  const flatHistoryRows = useMemo(
    () =>
      historyGroups.flatMap((group) =>
        group.rows
          .filter((row) => rowMatchesFilter(row, historyFilter))
          .map((row) => ({ groupLabel: group.label, row })),
      ),
    [historyFilter, historyGroups],
  );

  const visibleHistoryRows = flatHistoryRows.slice(0, historyVisibleCount);

  const tabs = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const openPersonDrilldownFromMetric = (
      metric: (typeof workspace.performanceKpis)[number],
      source: HTMLElement,
    ) => {
      if (!analytics) return;
      const request = buildMetricDrilldownRequest(metric, {
        personId: workspace.personId,
        personDisplayName: workspace.personName,
      });
      if (!request) return;
      analytics.openPersonAnalyticsDrilldown(workspace.personId, request, source, metric);
    };

    const openPersonDrilldownFromTrend = (
      trend: (typeof workspace.trends)[number],
      point: { date: string; value: number },
      source: HTMLElement | null,
    ) => {
      if (!analytics) return;
      const request = buildTrendDrilldownRequest(trend, point, {
        personId: workspace.personId,
        personDisplayName: workspace.personName,
      });
      if (!request) return;
      analytics.openPersonAnalyticsDrilldown(workspace.personId, request, source);
    };

    return [
      {
        value: "overview",
        label: "Overview",
        content: (
          <div className="person-detail-drawer__panel">
            <p className="person-detail-drawer__context">{workspace.contextLine}</p>
            <PersonPerformanceMetrics
              kpis={workspace.performanceKpis}
              cycleTime={workspace.cycleTime}
              onOpenMetric={
                analytics
                  ? (metric, source) => openPersonDrilldownFromMetric(metric, source)
                  : undefined
              }
            />

            <h3 className="person-detail-drawer__section-title">Trends</h3>
            <div className="person-detail-drawer__trends">
              {workspace.trends.map((trend) => {
                const hasChart = (trend.chartSeries?.length ?? 0) >= 2;
                if (trend.insufficientHistory) {
                  return (
                    <div
                      key={trend.label}
                      className="person-detail-drawer__trend-card person-detail-drawer__trend-card--compact"
                    >
                      <div className="person-detail-drawer__trend-head">
                        <span>{trend.label}</span>
                      </div>
                      <TrendInsufficientHistory
                        recorded={trend.historyRecordedDays}
                        recommended={trend.historyRecommendedDays}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={trend.label}
                    className={
                      hasChart
                        ? "person-detail-drawer__trend-card"
                        : "person-detail-drawer__trend-card person-detail-drawer__trend-card--compact"
                    }
                  >
                    <div className="person-detail-drawer__trend-head">
                      <span>{trend.label}</span>
                      <TrendValue trend={trend} />
                    </div>
                    {hasChart ? (
                      <TrendMiniChart
                        trend={trend}
                        onPointClick={
                          analytics
                            ? (point, source) =>
                                openPersonDrilldownFromTrend(trend, point, source)
                            : undefined
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {workspace.timeOff ? (
              <>
                <h3 className="person-detail-drawer__section-title">Availability</h3>
                <div className="person-detail-drawer__time-off">
                  <div>{workspace.timeOff.rangeLabel}</div>
                  {workspace.timeOff.note ? (
                    <div className="person-detail-drawer__time-off-note">
                      {workspace.timeOff.note}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {isDirectReport && person?.bamboo ? (
              <ManagerNewStarterContext
                bamboo={person.bamboo}
                matched={managerOnboarding}
                activeWorkCount={workspace.activeWorkCount}
              />
            ) : null}

            <h3 className="person-detail-drawer__section-title">Attention signals</h3>
            {groupedAttention.length === 0 ? (
              <DrawerPanelPlaceholder
                compact
                title="No active attention signals."
              />
            ) : (
              <AttentionSignalsTable
                groups={groupedAttention}
                jiraBaseUrl={jiraBaseUrl}
                persons={teamPersons}
              />
            )}
          </div>
        ),
      },
      {
        value: "work",
        label: "Work",
        content: (
          <div className="person-detail-drawer__panel">
            <p className="person-detail-drawer__context">{workspace.contextLine}</p>
            <p className="person-performance-metrics__active" data-testid="person-work-active-summary">
              Active work: <strong>{workspace.activeWorkCount}</strong>
            </p>
            <div className="person-detail-drawer__work-list">
              {workspace.workRows.length === 0 ? (
                <DrawerPanelPlaceholder compact title="No active work in this period." />
              ) : (
                workspace.workRows.map((item) => <PersonWorkRow key={item.key} item={item} />)
              )}
            </div>
            {workspace.problematicWork.length > 0 ? (
              <>
                <h3 className="person-detail-drawer__section-title">Problematic tasks</h3>
                <div className="person-detail-drawer__work-list">
                  {workspace.problematicWork.map((item) => (
                    <PersonWorkRow key={`problem-${item.key}`} item={item} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ),
      },
      {
        value: "history",
        label: "History",
        content: (
          <div className="person-detail-drawer__panel">
            <p className="person-detail-drawer__context">{workspace.contextLine}</p>
            <div className="person-detail-drawer__history-head">
              <div className="person-detail-drawer__history-controls">
                <Select
                  className="history-period-select"
                  aria-label="History period"
                  value={historyPeriod}
                  options={[
                    { value: "week", label: "By week" },
                    { value: "month", label: "By month" },
                    { value: "quarter", label: "By quarter" },
                  ]}
                  onChange={(event) =>
                    setHistoryPeriod(event.target.value as HistoryPeriod)
                  }
                />
                <SegmentedControl
                  ariaLabel="History outcome filter"
                  fullWidth
                  value={historyFilter}
                  onChange={setHistoryFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "first_pass", label: "First pass" },
                    { value: "rework", label: "Rework" },
                  ]}
                />
              </div>
            </div>

            {historyGroups.length === 0 ? (
              <DrawerPanelPlaceholder compact title="No completed work for this period." />
            ) : (
              historyGroups.map((group) => {
                const groupRows = visibleHistoryRows.filter(
                  (entry) => entry.groupLabel === group.label,
                );
                if (!groupRows.length) return null;
                return (
                  <div key={group.label} className="person-detail-drawer__history-group">
                    <h4 className="performance-subsection__title">
                      {formatWorkHistoryGroupLabel(group.label, historyPeriod)}
                    </h4>
                    <p className="performance-subsection__summary">
                      {formatWorkHistoryGroupSummary(group)}
                    </p>
                    <div className="person-detail-drawer__work-list">
                      {groupRows.map(({ row }) => (
                        <PersonWorkRow
                          key={`${group.label}-${row.key}`}
                          item={historyRowToWorkItem(row)}
                          jiraBaseUrl={jiraBaseUrl}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {historyVisibleCount < flatHistoryRows.length ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setHistoryVisibleCount((count) => count + HISTORY_PAGE_SIZE)
                }
              >
                Show more
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [
    analytics,
    flatHistoryRows.length,
    groupedAttention,
    historyGroups,
    historyFilter,
    historyPeriod,
    historyVisibleCount,
    isDirectReport,
    managerOnboarding,
    person,
    visibleHistoryRows,
    workspace,
  ]);

  if (!workspace) {
    return (
      <DrawerStack
        open={open}
        activePanel="primary"
        onClose={onClose}
        onClosed={onClosed}
        ariaLabel="Person"
        size="person"
        testId="person-detail-drawer"
      >
        <DrawerPanelPlaceholder role="status" title="Loading person…" />
      </DrawerStack>
    );
  }

  const displayName = workspace.personName || person?.bamboo.displayName || "—";
  const jobTitle = workspace.role || person?.bamboo.jobTitle || "—";

  const briefActive = activeView === "brief" && showBriefAction;

  return (
    <DrawerStack
      open={open}
      activePanel="primary"
      onClose={onClose}
      onClosed={onClosed}
      ariaLabel={
        briefActive
          ? `1:1 brief for ${displayName}`
          : `Person detail for ${displayName}`
      }
      size="person"
      className="drawer--person-detail"
      testId="person-detail-drawer"
      header={
        <PersonIdentityHeader
          personId={personId}
          displayName={displayName}
          jobTitle={jobTitle}
          person={person}
          availabilityLabel={workspace.availability}
          workloadLabel={workspace.workload}
        />
      }
      headerActions={
        showBriefAction ? (
          <SegmentedControl
            ariaLabel="Person drawer view"
            className="person-drawer-view-tabs"
            options={[
              { value: "profile", label: "Profile" },
              { value: "brief", label: "Brief" },
            ]}
            value={briefActive ? "brief" : "profile"}
            onChange={setActiveView}
          />
        ) : null
      }
    >
      <div
        className="person-drawer-view"
        data-person-drawer-view="profile"
        hidden={briefActive}
      >
        <Tabs
          items={tabs}
          value={activeTab}
          onValueChange={(value) => onTabChange?.(value as PersonDrawerTab)}
        />
      </div>
      {showBriefAction && briefMounted ? (
        <div
          className="person-drawer-view"
          data-person-drawer-view="brief"
          data-testid="person-brief-drawer"
          hidden={!briefActive}
        >
          <PersonBriefDrawerPanel
            personId={personId}
            prepForOneOnOne={prepForOneOnOne}
          />
        </div>
      ) : null}
    </DrawerStack>
  );
}
