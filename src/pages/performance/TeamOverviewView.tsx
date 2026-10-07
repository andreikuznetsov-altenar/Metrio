import { useEffect, useMemo, useState } from "react";
import { resolveJiraBaseUrl } from "../../config/product";
import { openExternalUrl } from "../../platform/openExternal";
import { loadPreferences } from "../../platform/preferences";
import { GroupedIssuePreview } from "../../components/GroupedIssuePreview/GroupedIssuePreview";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { actionOpenLabel, navigateActionTarget } from "../../app/actionNavigation";
import { navigateOpenTeamWorkloadSection } from "../../domain/home/attentionNavigation";
import { buildDirectorTeamActions } from "../../domain/actions/buildOrganizationActions";
import { buildTeamActions } from "../../domain/actions/buildTeamActions";
import { useOperationalRules } from "../../app/OperationalRulesContext";
import { summarizeFeedbackActions } from "../../domain/feedback/feedbackActionSummary";
import type { TeamSecondarySnapshot } from "../../domain/performance";
import { ActionQueueSection } from "./ActionQueueSection";
import { useOptionalPerformanceAnalytics } from "../../app/performanceAnalyticsContext";
import { Button } from "../../components/Button/Button";
import { Badge } from "../../components/Badge/Badge";
import { Card } from "../../components/Card/Card";
import { HelpIcon } from "../../components/HelpIcon/HelpIcon";
import { SectionTitle } from "../../components/SectionTitle/SectionTitle";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { MetricCardData, TeamPerformanceSnapshot, TrendCardData } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import {
  availabilityBadgeVariant,
  workloadBadgeVariantFromLabel,
} from "../../domain/performance/performanceStatusBadges";
import {
  CAPACITY_INSUFFICIENT_LABEL,
  CAPACITY_INSUFFICIENT_TOOLTIP,
} from "../../domain/workload/capacityPresentation";
import {
  TrendInsufficientHistory,
  TrendMiniChart,
} from "./TrendMiniChart";
import { TrendValue } from "./TrendValue";
import { severityAttentionLabel } from "./trendPresentation";
import { CalendarDays } from "lucide-react";
import { TeamUpcomingAvailabilitySection } from "./TeamUpcomingAvailabilitySection";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { PerformanceRecommendations } from "./PerformanceRecommendations";
import type { ProductRecommendation } from "../../domain/recommendations/buildProductRecommendations";

const ATTENTION_OVERVIEW_COLUMNS = [
  { id: "person", type: "person" as const },
  { id: "attention", type: "text" as const },
  { id: "issues", type: "number" as const },
  { id: "severity", type: "status" as const, statusKind: "attentionSeverity" as const },
  { id: "workload", type: "status" as const, statusKind: "workload" as const },
];

const WORKLOAD_OVERVIEW_COLUMNS = [
  { id: "person", type: "person" as const },
  { id: "active", type: "number" as const },
  { id: "atRisk", type: "number" as const },
  { id: "workload", type: "status" as const, statusKind: "workload" as const },
  { id: "availability", type: "status" as const, statusKind: "availability" as const },
];

export interface TeamOverviewViewProps {
  snapshot: TeamPerformanceSnapshot;
  secondary: TeamSecondarySnapshot;
  onOpenPerson: (personId: string) => void;
  onViewAllRadar?: () => void;
  onOpenMetricDrilldown?: (metric: MetricCardData, source: HTMLElement) => void;
  onOpenTrendDrilldown?: (
    trend: TrendCardData,
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => void;
}

const METRIC_HELP: Record<string, string> = {
  Efficiency: performanceHelp.efficiency,
  "First pass": performanceHelp.firstPass,
  Completed: performanceHelp.completed,
  Backflows: performanceHelp.backflows,
};

function severityBadgeVariant(
  severity: import("../../domain/radar/types").RadarSeverity,
): import("../../components/Badge/Badge").BadgeVariant {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

function workloadBadgeVariant(
  workload: TeamPerformanceSnapshot["workload"][number]["workload"],
) {
  return workloadBadgeVariantFromLabel(workload);
}

const visualInsufficientHistoryFixture =
  import.meta.env.VITE_VISUAL_FIXTURE === "1" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("visualInsufficientHistory") === "1";

const visualKpiNoComparisonFixture =
  import.meta.env.VITE_VISUAL_FIXTURE === "1" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("visualKpiNoComparison") === "1";

export function TeamOverviewView({
  snapshot,
  secondary,
  onOpenPerson,
  onViewAllRadar,
  onOpenMetricDrilldown,
  onOpenTrendDrilldown,
}: TeamOverviewViewProps) {
  const { currentUser } = useCurrentUser();
  const analytics = useOptionalPerformanceAnalytics();
  const surveyData = useFeedbackSurveyStore((state) => state.data);
  const feedbackSummary = useMemo(
    () => summarizeFeedbackActions(surveyData),
    [surveyData],
  );
  const { rules: operationalRules } = useOperationalRules();
  const { data: performanceData } = usePerformanceData();
  const teamPersons = performanceData?.teamSnapshot.persons ?? [];
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  const peopleById = useMemo(() => {
    const map = new Map<string, TeamSecondarySnapshot["people"][number]>();
    for (const person of secondary.people) {
      map.set(person.personId, person);
    }
    return map;
  }, [secondary.people]);

  const teamActions = useMemo(() => {
    const input = {
      snapshot,
      deliveryRisk: secondary.deliveryRisk,
      feedback: feedbackSummary,
      operationalRules,
    };
    if (currentUser?.orgRole === "manager_of_managers") {
      return buildDirectorTeamActions(input);
    }
    if (currentUser?.person.role === "director") {
      return buildDirectorTeamActions(input);
    }
    return buildTeamActions(input);
  }, [
    snapshot,
    secondary.deliveryRisk,
    feedbackSummary,
    currentUser?.person.role,
    currentUser?.orgRole,
    operationalRules,
  ]);

  const actionTitle =
    currentUser?.orgRole === "manager_of_managers" ||
    currentUser?.person.role === "director"
      ? "Organization actions"
      : "Team actions";

  const handleAction = (item: import("../../domain/actions/actionTypes").ActionItem) => {
    navigateActionTarget(item.target, {
      openPerson: (personId, tab) => {
        if (analytics) {
          analytics.openPersonDrawer({ personId, tab });
          return;
        }
        onOpenPerson(personId);
      },
    });
  };

  const attentionGetValue = useMemo(
    () =>
      (row: TeamPerformanceSnapshot["attention"][number], columnId: string) => {
        switch (columnId) {
          case "person":
            return row.personName || row.personId;
          case "attention":
            return row.reason;
          case "issues":
            return row.issueCount;
          case "severity":
            return row.severity;
          case "workload":
            return row.workload ?? "";
          default:
            return "";
        }
      },
    [],
  );

  const workloadGetValue = useMemo(
    () => (row: TeamPerformanceSnapshot["workload"][number], columnId: string) => {
      switch (columnId) {
        case "person":
          return row.personName || row.personId;
        case "active":
          return row.activeWork;
        case "atRisk":
          return row.atRisk;
        case "workload":
          return row.workload;
        case "availability":
          return row.availability;
        default:
          return "";
      }
    },
    [],
  );

  const attentionSort = useTableSort(
    snapshot.attention,
    ATTENTION_OVERVIEW_COLUMNS,
    attentionGetValue,
  );
  const workloadSort = useTableSort(
    snapshot.workload,
    WORKLOAD_OVERVIEW_COLUMNS,
    workloadGetValue,
  );

  const summaryMetrics = useMemo(() => {
    if (!visualKpiNoComparisonFixture) return snapshot.summary;
    return snapshot.summary.map((metric, index) =>
      index === 0
        ? {
            ...metric,
            contextLabel: undefined,
            contextSemantic: undefined,
            contextCaption: undefined,
          }
        : metric,
    );
  }, [snapshot.summary]);

  const deliverySummary = useMemo(
    () => ({
      problematic: secondary.deliveryRisk.filter((row) =>
        /problematic/i.test(row.status),
      ).length,
      longReview: secondary.deliveryRisk.filter((row) =>
        /long review/i.test(row.riskReason),
      ).length,
      backflowSignals: Number(
        snapshot.summary.find((m) => m.label === "Backflows")?.value ?? 0,
      ),
    }),
    [secondary.deliveryRisk, snapshot.summary],
  );

  const onPerformanceRecommendation = (rec: ProductRecommendation) => {
    if (rec.actionKind === "open_delivery_risk") {
      window.dispatchEvent(
        new CustomEvent("metrio-open-performance-tab", { detail: "delivery-risk" }),
      );
      return;
    }
    if (rec.actionKind === "view_person" && rec.personId) {
      onOpenPerson(rec.personId);
      return;
    }
    if (rec.actionKind === "open_jira" && rec.issueKey) {
      navigateActionTarget({ kind: "jira", issueKey: rec.issueKey }, { openPerson: onOpenPerson });
      return;
    }
    if (rec.actionKind === "open_team_workload") {
      navigateOpenTeamWorkloadSection();
      return;
    }
    if (rec.actionKind === "open_performance") {
      window.dispatchEvent(
        new CustomEvent("metrio-open-performance-tab", { detail: "overview" }),
      );
    }
  };

  return (
    <>
      <ActionQueueSection
        variant="dashboard"
        title={actionTitle}
        workColumnLabel="Work"
        items={teamActions}
        emptyMessage="No high-priority team actions right now."
        onOpen={handleAction}
        openLabel={actionOpenLabel}
      />
      <PerformanceRecommendations
        deliverySummary={deliverySummary}
        deliveryRiskCount={secondary.deliveryRisk.length}
        teamWorkload={snapshot.workload}
        teamActions={teamActions}
        onAction={onPerformanceRecommendation}
      />
      <section aria-label="Summary metrics">
        <div className="performance-metrics">
          {summaryMetrics.map((metric, metricIndex) => {
            const drilldownEnabled = Boolean(onOpenMetricDrilldown) &&
              ["Efficiency", "First pass", "Completed", "Backflows"].includes(metric.label);
            const cardClass = drilldownEnabled
              ? "performance-metric-card performance-metric-card--interactive"
              : "performance-metric-card";
            const valueText = metric.value;
            const ariaLabel = drilldownEnabled
              ? `View ${metric.label} details, ${valueText}`
              : undefined;
            const kpiTestId =
              visualKpiNoComparisonFixture && metricIndex === 0
                ? "visual-kpi-no-comparison"
                : undefined;

            return (
            <Card key={metric.label} className={cardClass} data-testid={kpiTestId}>
              <div className="performance-metric-card__label">
                {metric.label}
                {METRIC_HELP[metric.label] ? (
                  <span
                    className="performance-metric-card__help"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <HelpIcon label={METRIC_HELP[metric.label]} />
                  </span>
                ) : null}
              </div>
              {drilldownEnabled ? (
                <button
                  type="button"
                  className="performance-metric-card__trigger"
                  aria-label={ariaLabel}
                  onClick={(event) =>
                    onOpenMetricDrilldown?.(metric, event.currentTarget)
                  }
                >
                  <div className="performance-metric-card__value">{metric.value}</div>
                  {metric.status ? (
                    <div className="performance-metric-card__status">
                      {metric.statusVariant ? (
                        <Badge variant={metric.statusVariant}>{metric.status}</Badge>
                      ) : (
                        metric.status
                      )}
                    </div>
                  ) : null}
                  {metric.contextLabel ? (
                    <div
                      className={`performance-metric-card__context performance-metric-card__context--${metric.contextSemantic || "neutral"}`}
                    >
                      <Tooltip
                        content={
                          metric.contextCaption
                            ? `${metric.contextCaption}`
                            : metric.contextLabel
                        }
                      >
                        <span>{metric.contextLabel}</span>
                      </Tooltip>
                      {metric.contextCaption ? (
                        <span className="performance-metric-card__context-caption">
                          {metric.contextCaption}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              ) : (
                <>
                  <div className="performance-metric-card__value">{metric.value}</div>
                  {metric.status ? (
                    <div className="performance-metric-card__status">
                      {metric.statusVariant ? (
                        <Badge variant={metric.statusVariant}>{metric.status}</Badge>
                      ) : (
                        metric.status
                      )}
                    </div>
                  ) : null}
                  {metric.contextLabel ? (
                    <div
                      className={`performance-metric-card__context performance-metric-card__context--${metric.contextSemantic || "neutral"}`}
                    >
                      <Tooltip
                        content={
                          metric.contextCaption
                            ? `${metric.contextCaption}`
                            : metric.contextLabel
                        }
                      >
                        <span>{metric.contextLabel}</span>
                      </Tooltip>
                      {metric.contextCaption ? (
                        <span className="performance-metric-card__context-caption">
                          {metric.contextCaption}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </Card>
            );
          })}
        </div>
      </section>

      <section
        id="performance-section-team-attention"
        aria-label="Team attention"
        className="performance-section"
      >
        <SectionTitle
          inline
          title="Team attention"
          help={performanceHelp.teamAttention}
          actions={
            snapshot.attentionTotalCount > snapshot.attention.length &&
            onViewAllRadar ? (
              <Button type="button" variant="ghost" onClick={onViewAllRadar}>
                View all in Radar ({snapshot.attentionTotalCount})
              </Button>
            ) : null
          }
        />
        {snapshot.attention.length === 0 ? (
          <div className="performance-empty performance-empty--compact">
            <span className="performance-empty__icon" aria-hidden>◎</span>
            <p className="performance-empty__message">
              No direct reports need attention right now.
            </p>
          </div>
        ) : (
          <div className="performance-table-wrap performance-table-wrap--attention">
            <table className="performance-table performance-table--interactive performance-table--attention">
              <colgroup>
                <col className="col-person" />
                <col className="col-reason" />
                <col className="col-issues" />
                <col className="col-badge" />
                <col className="col-badge" />
              </colgroup>
              <thead>
                <tr>
                  <SortableTableHeader
                    columnId="person"
                    label="Person"
                    sort={attentionSort.sort}
                    onToggle={attentionSort.toggleSort}
                  />
                  <SortableTableHeader
                    columnId="attention"
                    label="Attention"
                    sort={attentionSort.sort}
                    onToggle={attentionSort.toggleSort}
                  />
                  <SortableTableHeader
                    columnId="issues"
                    label="Issues"
                    sort={attentionSort.sort}
                    onToggle={attentionSort.toggleSort}
                  />
                  <SortableTableHeader
                    columnId="severity"
                    label="Severity"
                    sort={attentionSort.sort}
                    onToggle={attentionSort.toggleSort}
                  />
                  <SortableTableHeader
                    columnId="workload"
                    label="Workload"
                    sort={attentionSort.sort}
                    onToggle={attentionSort.toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {attentionSort.sortedRows.map((item) => {
                  const name = item.personName || item.personId;
                  const personRecord = peopleById.get(item.personId);
                  const roleLine =
                    personRecord?.role && personRecord.role !== "—"
                      ? personRecord.role
                      : item.personRole;
                  const issueKeys =
                    item.issueKeys.length > 0
                      ? item.issueKeys
                      : item.issueCount > 0
                        ? []
                        : [];
                  return (
                    <tr
                      key={item.personId}
                      className="performance-table__clickable-row"
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (
                          target.closest(
                            '[data-testid="grouped-issue-count-link"], [data-testid="grouped-issue-preview"]',
                          )
                        ) {
                          return;
                        }
                        onOpenPerson(item.personId);
                      }}
                      data-testid="team-attention-row"
                    >
                      <td>
                        <div className="performance-table__person-inline">
                          <PersonAvatar
                            personId={item.personId}
                            displayName={name}
                            size="sm"
                          />
                          <span>
                            <span className="performance-table__person-name">{name}</span>
                            {roleLine ? (
                              <span className="performance-table__person-role">
                                {roleLine}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="performance-table__reason">{item.reason}</td>
                      <td className="performance-table__issues-cell">
                        {issueKeys.length === 0 && item.issueCount > 0 ? (
                          <span className="performance-table__issues-fallback">
                            {item.issueCount} issues
                          </span>
                        ) : issueKeys.length > 0 ? (
                          <GroupedIssuePreview
                            issueKeys={issueKeys}
                            jiraBaseUrl={jiraBaseUrl}
                            persons={teamPersons}
                            personNameForModal={name}
                            onOpenIssue={(_issueKey, url) => {
                              if (url) void openExternalUrl(url);
                            }}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Badge variant={severityBadgeVariant(item.severity)}>
                          {severityAttentionLabel(item.severity)}
                        </Badge>
                      </td>
                      <td>
                        {item.workload ? (
                          <Badge variant={workloadBadgeVariantFromLabel(item.workload)}>
                            {item.workload}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Team trends" className="performance-section">
        <SectionTitle title="Team trends" help={performanceHelp.teamTrends} />
        <div className="performance-trends">
          {snapshot.trends.map((trend) => (
            <Card key={trend.label} className="performance-trend-card">
              <div className="performance-trend-card__label">{trend.label}</div>
              <TrendValue trend={trend} />
              {trend.chartSeries && trend.chartSeries.length >= 2 ? (
                <TrendMiniChart
                  trend={trend}
                  onPointClick={(point, source) =>
                    onOpenTrendDrilldown?.(trend, point, source)
                  }
                />
              ) : trend.insufficientHistory ? null : (
                <div className="performance-trend-card__sparkline-empty" aria-hidden />
              )}
            </Card>
          ))}
        </div>
      </section>

      <section
        id="performance-section-team-workload"
        aria-label="Team workload"
        className="performance-section"
      >
        <SectionTitle title="Team workload" help={performanceHelp.teamWorkload} />
        <div className="performance-table-wrap">
          <table className="performance-table performance-table--interactive performance-table--team-workload">
            <colgroup>
              <col className="col-person" />
              <col className="col-num" />
              <col className="col-num" />
              <col className="col-badge" />
              <col className="col-badge" />
            </colgroup>
            <thead>
              <tr>
                <SortableTableHeader
                  columnId="person"
                  label="Person"
                  sort={workloadSort.sort}
                  onToggle={workloadSort.toggleSort}
                />
                <SortableTableHeader
                  columnId="active"
                  label="Active"
                  sort={workloadSort.sort}
                  onToggle={workloadSort.toggleSort}
                  className="performance-table__num"

                />
                <SortableTableHeader
                  columnId="atRisk"
                  label="At-risk tasks"
                  sort={workloadSort.sort}
                  onToggle={workloadSort.toggleSort}
                  className="performance-table__num"

                />
                <SortableTableHeader
                  columnId="workload"
                  label="Workload"
                  sort={workloadSort.sort}
                  onToggle={workloadSort.toggleSort}
                />
                <SortableTableHeader
                  columnId="availability"
                  label="Availability"
                  sort={workloadSort.sort}
                  onToggle={workloadSort.toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {workloadSort.sortedRows.map((row) => {
                const personRecord = peopleById.get(row.personId);
                const roleLine = personRecord?.role;
                const name = row.personName || row.personId;
                return (
                <tr key={row.personId} data-testid="team-workload-row">
                  <td>
                    <button
                      type="button"
                      className="performance-table__person-button performance-table__person-button--with-avatar"
                      onClick={() => onOpenPerson(row.personId)}
                    >
                      <PersonAvatar personId={row.personId} displayName={name} size="sm" />
                      <span className="performance-table__person-text">
                        <span className="performance-table__person-name">{name}</span>
                        {roleLine && roleLine !== "—" ? (
                          <span className="performance-table__person-role">{roleLine}</span>
                        ) : null}
                      </span>
                    </button>
                  </td>
                  <td className="performance-table__num">{row.activeWork}</td>
                  <td className="performance-table__num">{row.atRisk}</td>
                  <td>
                    <Badge
                      variant={workloadBadgeVariant(row.workload)}
                      title={
                        row.workload === CAPACITY_INSUFFICIENT_LABEL
                          ? CAPACITY_INSUFFICIENT_TOOLTIP
                          : undefined
                      }
                    >
                      {row.workload}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={availabilityBadgeVariant(row.availability)}>
                      {row.availability}
                    </Badge>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <TeamUpcomingAvailabilitySection
        snapshot={snapshot}
        deliveryRisk={secondary.deliveryRisk}
        onOpenPerson={onOpenPerson}
      />

      <section aria-label="Time off" className="performance-section">
        <SectionTitle title="Time off" help={performanceHelp.timeOff} />
        {snapshot.timeOff.length === 0 ? (
          <div className="performance-empty performance-empty--compact performance-empty--timeoff">
            <CalendarDays size={18} strokeWidth={1.75} aria-hidden className="performance-empty__icon" />
            <p className="performance-empty__message">No upcoming time off</p>
          </div>
        ) : (
          <ul className="performance-timeoff-list">
            {snapshot.timeOff.map((entry) => (
              <li
                key={`${entry.personId}-${entry.rangeLabel}`}
                className="performance-timeoff-item"
              >
                <span>
                  <span className="performance-timeoff-item__name">
                    {entry.personName || entry.personId}
                  </span>
                  <span className="performance-timeoff-item__meta">
                    {" "}
                    · {entry.rangeLabel}
                  </span>
                </span>
                <span className="performance-timeoff-item__meta">{entry.note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {visualInsufficientHistoryFixture ? (
        <section
          aria-label="Visual insufficient history fixture"
          className="performance-section"
          data-testid="visual-insufficient-history-card"
        >
          <div className="performance-trends">
            <Card className="performance-trend-card">
              <div className="performance-trend-card__label">Completed</div>
              <TrendValue
                trend={{
                  label: "Completed",
                  value: "Not enough history",
                  insufficientHistory: true,
                }}
              />
              <TrendInsufficientHistory recorded={63} recommended={155} />
            </Card>
          </div>
        </section>
      ) : null}
    </>
  );
}
