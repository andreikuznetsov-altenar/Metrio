import { useMemo } from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { actionOpenLabel, navigateActionTarget } from "../../app/actionNavigation";
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
  TrendInsufficientHistory,
  TrendMiniChart,
} from "./TrendMiniChart";
import { TrendValue } from "./TrendValue";
import { severityAttentionLabel } from "./trendPresentation";
import { CalendarDays } from "lucide-react";
import { TeamUpcomingAvailabilitySection } from "./TeamUpcomingAvailabilitySection";

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

  const teamActions = useMemo(() => {
    const input = {
      snapshot,
      deliveryRisk: secondary.deliveryRisk,
      feedback: feedbackSummary,
      operationalRules,
    };
    if (currentUser?.person.role === "director") {
      return buildDirectorTeamActions(input);
    }
    return buildTeamActions(input);
  }, [
    snapshot,
    secondary.deliveryRisk,
    feedbackSummary,
    currentUser?.person.role,
    operationalRules,
  ]);

  const actionTitle =
    currentUser?.person.role === "director" ? "Organization actions" : "Team actions";

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

  return (
    <>
      <ActionQueueSection
        variant="dashboard"
        title={actionTitle}
        items={teamActions}
        emptyMessage="No high-priority team actions right now."
        onOpen={handleAction}
        openLabel={actionOpenLabel}
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

      <section aria-label="Team attention" className="performance-section">
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
            No direct reports need attention right now.
          </div>
        ) : (
          <div className="performance-table-wrap performance-table-wrap--attention">
            <table className="performance-table performance-table--interactive performance-table--attention">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Attention</th>
                  <th>Issues</th>
                  <th>Severity</th>
                  <th>Workload</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.attention.map((item) => {
                  const name = item.personName || item.personId;
                  return (
                    <tr
                      key={item.personId}
                      className="performance-table__clickable-row"
                      onClick={() => onOpenPerson(item.personId)}
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
                            {item.personRole ? (
                              <span className="performance-table__person-role">
                                {item.personRole}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="performance-table__reason">{item.reason}</td>
                      <td>
                        <div className="issue-chip-list">
                          {item.issueKeys.map((key) => (
                            <Badge key={key} variant="neutral">
                              {key}
                            </Badge>
                          ))}
                          {item.issueCount > item.issueKeys.length ? (
                            <span className="issue-chip-list__more">
                              +{item.issueCount - item.issueKeys.length} more
                            </span>
                          ) : null}
                        </div>
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

      <section aria-label="Team workload" className="performance-section">
        <SectionTitle title="Team workload" help={performanceHelp.teamWorkload} />
        <div className="performance-table-wrap">
          <table className="performance-table performance-table--interactive">
            <thead>
              <tr>
                <th>Person</th>
                <th className="performance-table__num">Active</th>
                <th className="performance-table__num">
                  <Tooltip content={performanceHelp.atRiskTasks}>
                    <span>At-risk tasks</span>
                  </Tooltip>
                </th>
                <th>Workload</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.workload.map((row) => (
                <tr key={row.personId}>
                  <td>
                    <button
                      type="button"
                      className="performance-table__person-button"
                      onClick={() => onOpenPerson(row.personId)}
                    >
                      {row.personName || row.personId}
                    </button>
                  </td>
                  <td className="performance-table__num">{row.activeWork}</td>
                  <td className="performance-table__num">{row.atRisk}</td>
                  <td>
                    <Badge variant={workloadBadgeVariant(row.workload)}>
                      {row.workload}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={availabilityBadgeVariant(row.availability)}>
                      {row.availability}
                    </Badge>
                  </td>
                </tr>
              ))}
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
            <span>No upcoming time off</span>
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
