import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { TeamPerformanceSnapshot } from "../../domain/performance";
import { personInitials } from "../../domain/types";
import { Sparkline } from "./Sparkline";
import { TrendValue } from "./TrendValue";
import { severityAttentionLabel } from "./trendPresentation";

export interface TeamOverviewViewProps {
  snapshot: TeamPerformanceSnapshot;
  onOpenPerson: (personId: string) => void;
  onViewAllRadar?: () => void;
}

function severityBadgeVariant(
  severity: import("../../domain/radar/types").RadarSeverity,
): import("../../components/Badge/Badge").BadgeVariant {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

export function TeamOverviewView({
  snapshot,
  onOpenPerson,
  onViewAllRadar,
}: TeamOverviewViewProps) {
  return (
    <>
      <section aria-label="Summary metrics">
        <div className="performance-metrics">
          {snapshot.summary.map((metric) => (
            <Card key={metric.label} className="performance-metric-card">
              <div className="performance-metric-card__label">{metric.label}</div>
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
                  <span>{metric.contextLabel}</span>
                  {metric.contextCaption ? (
                    <span className="performance-metric-card__context-caption">
                      {metric.contextCaption}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Team attention" className="performance-section">
        <div className="performance-section-head">
          <h3 className="performance-section__title performance-section__title--inline">
            Team attention
          </h3>
          {snapshot.attentionTotalCount > snapshot.attention.length &&
          onViewAllRadar ? (
            <Button type="button" variant="ghost" onClick={onViewAllRadar}>
              View all in Radar ({snapshot.attentionTotalCount})
            </Button>
          ) : null}
        </div>
        {snapshot.attention.length === 0 ? (
          <div className="performance-empty performance-empty--compact">
            No direct reports need attention right now.
          </div>
        ) : (
          <div className="performance-attention-list">
            {snapshot.attention.map((item) => {
              const name = item.personName || item.personId;
              return (
                <button
                  key={item.personId}
                  type="button"
                  className="performance-attention-row"
                  onClick={() => onOpenPerson(item.personId)}
                >
                  <span className="performance-avatar performance-avatar--sm" aria-hidden>
                    {personInitials(name)}
                  </span>
                  <span className="performance-attention-row__main">
                    <div className="performance-attention-row__title-line">
                      <span className="performance-attention-row__name">{name}</span>
                      {item.personRole ? (
                        <span className="performance-attention-row__role">
                          {item.personRole}
                        </span>
                      ) : null}
                    </div>
                    <div className="performance-attention-row__reason">{item.reason}</div>
                  </span>
                  <span className="performance-attention-row__meta">
                    <Badge variant={severityBadgeVariant(item.severity)}>
                      {severityAttentionLabel(item.severity)}
                    </Badge>
                    {item.issueKeys.map((key) => (
                      <Badge key={key} variant="neutral">
                        {key}
                      </Badge>
                    ))}
                    {item.issueCount > item.issueKeys.length ? (
                      <span className="performance-attention-row__more">
                        +{item.issueCount - item.issueKeys.length} more
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Team trends" className="performance-section">
        <h3 className="performance-section__title">Team trends</h3>
        <div className="performance-trends">
          {snapshot.trends.map((trend) => (
            <Card key={trend.label} className="performance-trend-card">
              <div className="performance-trend-card__label">{trend.label}</div>
              <TrendValue trend={trend} />
              {trend.sparkline ? (
                <Sparkline values={trend.sparkline} />
              ) : trend.insufficientHistory ? (
                <div className="performance-trend-card__sparkline-empty">
                  Not enough history
                </div>
              ) : (
                <div className="performance-trend-card__sparkline-empty" aria-hidden />
              )}
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Team workload" className="performance-section">
        <h3 className="performance-section__title">Team workload</h3>
        <div className="performance-table-wrap">
          <table className="performance-table performance-table--interactive">
            <thead>
              <tr>
                <th>Person</th>
                <th className="performance-table__num">Active</th>
                <th className="performance-table__num">
                  <Tooltip content="Active tasks flagged at risk by cycle-time rules (not the same as Radar signals).">
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
                    <Badge
                      variant={
                        row.workload === "Heavy"
                          ? "warning"
                          : row.workload === "Light"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {row.workload}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="neutral">{row.availability}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Time off" className="performance-section">
        <h3 className="performance-section__title">Time off</h3>
        {snapshot.timeOff.length === 0 ? (
          <div className="performance-empty performance-empty--compact performance-empty--timeoff">
            <span className="performance-empty__icon" aria-hidden>
              ◷
            </span>
            <span>No upcoming time off for direct reports.</span>
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
    </>
  );
}
