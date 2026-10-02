import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { Select } from "../../components/Select/Select";
import { Tabs } from "../../components/Tabs/Tabs";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { canOpenPersonBrief } from "../../domain/personAccess";
import { useOnboardingResources } from "../../hooks/useOnboardingResources";
import { ManagerNewStarterContext } from "../onboarding/ManagerNewStarterContext";
import {
  useOptionalPerformanceAnalytics,
  type PersonDrawerTab,
} from "../../app/performanceAnalyticsContext";
import type { AnalyticsEvidenceIssue } from "../../domain/analytics/analyticsEvidenceTypes";
import type { WorkHistoryRow } from "../../domain/performance";
import {
  formatWorkHistoryGroupLabel,
  formatWorkHistoryGroupSummary,
} from "../../domain/personal/workHistoryDisplay";
import { groupAttentionSignals, hiddenAttentionKeyCount } from "./groupAttentionSignals";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";
import { PersonWorkRow } from "./PersonWorkRow";
import { PersonPerformanceMetrics } from "./PersonPerformanceMetrics";
import { TrendMiniChart } from "./TrendMiniChart";
import { TrendValue } from "./TrendValue";
import {
  buildMetricDrilldownRequest,
  buildTrendDrilldownRequest,
} from "./analyticsDrilldownModel";
import "./person-detail-drawer.css";
import "./performance-dashboard.css";

const HISTORY_PAGE_SIZE = 15;

export interface PersonDetailDrawerProps {
  personId: string;
  open: boolean;
  activeTab?: PersonDrawerTab;
  onTabChange?: (tab: PersonDrawerTab) => void;
  onClose: () => void;
  onClosed?: () => void;
}

type HistoryPeriod = "week" | "month" | "quarter";

function historyRowToIssue(
  row: WorkHistoryRow,
  personId: string,
  personName: string,
): AnalyticsEvidenceIssue {
  return {
    issueKey: row.key,
    title: row.title,
    personId,
    personName,
    projectKey: row.project,
    outcome: /first pass/i.test(row.outcome) ? "first_pass" : "rework",
    status: row.completedOn,
    cycleLabel: row.cycle,
  };
}

export function PersonDetailDrawer({
  personId,
  open,
  activeTab = "overview",
  onTabChange,
  onClose,
  onClosed,
}: PersonDetailDrawerProps) {
  const { viewModels } = usePerformanceData();
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
  const [historyVisibleCount, setHistoryVisibleCount] = useState(HISTORY_PAGE_SIZE);

  useEffect(() => {
    if (open) {
      setHistoryVisibleCount(HISTORY_PAGE_SIZE);
    }
  }, [open, personId, historyPeriod]);

  const groupedAttention = useMemo(
    () => (workspace ? groupAttentionSignals(workspace.attention) : []),
    [workspace],
  );

  const historyGroups = useMemo(() => {
    if (!workspace) return [];
    if (historyPeriod === "week") return workspace.historyWeek;
    if (historyPeriod === "quarter") return workspace.historyQuarter;
    return workspace.historyMonth;
  }, [historyPeriod, workspace]);

  const flatHistoryRows = useMemo(
    () =>
      historyGroups.flatMap((group) =>
        group.rows.map((row) => ({ groupLabel: group.label, row })),
      ),
    [historyGroups],
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
            <div className="person-detail-drawer__context-meta">
              <span>{workspace.role}</span>
              <span>{workspace.availability}</span>
              {workspace.timeOff ? <span>{workspace.timeOff.rangeLabel}</span> : null}
            </div>
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
                        <TrendValue trend={trend} />
                      </div>
                      <p className="person-detail-drawer__trend-empty">Not enough history</p>
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
              <p className="person-detail-drawer__empty">No active attention signals.</p>
            ) : (
              <div className="performance-work-list">
                {groupedAttention.map((group) => {
                  const visibleKeys = group.issueKeys.slice(0, 2);
                  const extraKeys = hiddenAttentionKeyCount(group.taskCount, visibleKeys);
                  return (
                    <div
                      key={`${group.label}-${group.reason}`}
                      className="performance-work-row performance-work-row--drawer performance-work-row--attention"
                    >
                      <div className="performance-work-row__main">
                        <div className="performance-attention-group__head">
                          <Badge variant={group.variant}>{group.label}</Badge>
                          <span className="performance-attention-group__count">
                            {group.taskCount} {group.taskCount === 1 ? "task" : "tasks"}
                          </span>
                        </div>
                        <div className="performance-work-row__meta">{group.reason}</div>
                        {visibleKeys.length > 0 || extraKeys > 0 ? (
                          <div className="issue-chip-list performance-attention-group__keys">
                            {visibleKeys.map((key) => (
                              <Badge key={key} variant="neutral">
                                {key}
                              </Badge>
                            ))}
                            {extraKeys > 0 ? (
                              <span className="issue-chip-list__more">+{extraKeys} more</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
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
            <div className="performance-work-list">
              {workspace.workRows.length === 0 ? (
                <p className="person-detail-drawer__empty">No active work in this period.</p>
              ) : (
                workspace.workRows.map((item) => <PersonWorkRow key={item.key} item={item} />)
              )}
            </div>
            {workspace.problematicWork.length > 0 ? (
              <>
                <h3 className="person-detail-drawer__section-title">Problematic tasks</h3>
                <div className="performance-work-list">
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
              </div>
            </div>

            {historyGroups.length === 0 ? (
              <p className="person-detail-drawer__empty">No completed work for this period.</p>
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
                    <div className="person-detail-drawer__history-list">
                      {groupRows.map(({ row }) => (
                        <AnalyticsIssueRow
                          key={`${group.label}-${row.key}`}
                          issue={historyRowToIssue(
                            row,
                            workspace.personId,
                            workspace.personName,
                          )}
                          showOutcome
                          hidePerson
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
                variant="ghost"
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
    historyPeriod,
    historyVisibleCount,
    visibleHistoryRows,
    workspace,
  ]);

  if (!workspace) {
    return null;
  }

  const displayName = workspace.personName || person?.bamboo.displayName || "—";
  const jobTitle = workspace.role || person?.bamboo.jobTitle || "—";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      ariaLabel={`Person detail for ${displayName}`}
      size="person"
      header={
        <div className="person-detail-drawer__identity">
          <PersonAvatar employeeId={personId} displayName={displayName} size="md" />
          <div className="person-detail-drawer__identity-text">
            <div className="person-detail-drawer__name">{displayName}</div>
            <div className="person-detail-drawer__role">{jobTitle}</div>
            <div className="person-detail-drawer__meta">
              {workspace.availability} · {workspace.workload} workload
            </div>
          </div>
          {showBriefAction ? (
            <Button
              type="button"
              variant="secondary"
              className="person-detail-drawer__brief-btn"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("metrio-open-person-brief", {
                    detail: { personId },
                  }),
                );
              }}
            >
              Brief
            </Button>
          ) : null}
        </div>
      }
    >
      <Tabs
        items={tabs}
        value={activeTab}
        onValueChange={(value) => onTabChange?.(value as PersonDrawerTab)}
      />
    </Drawer>
  );
}
