import { Badge } from "../../components/Badge/Badge";
import { Card } from "../../components/Card/Card";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { TeamPerformanceSnapshot } from "../../domain/performance";
import { personInitials } from "../../domain/types";
import { Sparkline } from "./Sparkline";

export interface TeamOverviewViewProps {
  snapshot: TeamPerformanceSnapshot;
  onOpenPerson: (personId: string) => void;
}

export function TeamOverviewView({
  snapshot,
  onOpenPerson,
}: TeamOverviewViewProps) {
  return (
    <>
      <section aria-label="Summary metrics">
        <div className="performance-metrics">
          {snapshot.summary.map((metric) => (
            <Card key={metric.label} className="performance-metric-card">
              {metric.tooltip ? (
                <Tooltip content={metric.tooltip}>
                  <div>
                    <div className="performance-metric-card__label">
                      {metric.label}
                    </div>
                    <div className="performance-metric-card__value">
                      {metric.value}
                    </div>
                    {metric.status ? (
                      <div className="performance-metric-card__status">
                        {metric.statusVariant ? (
                          <Badge variant={metric.statusVariant}>
                            {metric.status}
                          </Badge>
                        ) : (
                          metric.status
                        )}
                      </div>
                    ) : null}
                  </div>
                </Tooltip>
              ) : (
                <>
                  <div className="performance-metric-card__label">
                    {metric.label}
                  </div>
                  <div className="performance-metric-card__value">
                    {metric.value}
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Team attention">
        <h3 className="performance-section__title">Team attention</h3>
        {snapshot.attention.length === 0 ? (
          <div className="performance-empty performance-attention-list">
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
                  <span className="performance-avatar" aria-hidden>
                    {personInitials(name)}
                  </span>
                  <span className="performance-attention-row__main">
                    <div className="performance-attention-row__name">
                      {name}
                    </div>
                    {item.personRole ? (
                      <div className="performance-attention-row__role">
                        {item.personRole}
                      </div>
                    ) : null}
                    <div className="performance-attention-row__reason">
                      {item.reason}
                    </div>
                  </span>
                  <span className="performance-attention-row__badges">
                    {item.indicators.map((indicator) => (
                      <Badge key={indicator.label} variant={indicator.variant}>
                        {indicator.label}
                      </Badge>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Team trends">
        <h3 className="performance-section__title">Team trends</h3>
        <div className="performance-trends">
          {snapshot.trends.map((trend) => (
            <Card key={trend.label} className="performance-trend-card">
              <div className="performance-trend-card__label">{trend.label}</div>
              <div className="performance-trend-card__value">{trend.value}</div>
              {trend.sparkline ? (
                <Sparkline values={trend.sparkline} />
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Team workload">
        <h3 className="performance-section__title">Team workload</h3>
        <div className="performance-table-wrap">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Active work</th>
                <th>At risk</th>
                <th>Workload</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.workload.map((row) => (
                <tr key={row.personId}>
                  <td>{row.personName || row.personId}</td>
                  <td>{row.activeWork}</td>
                  <td>{row.atRisk}</td>
                  <td>{row.workload}</td>
                  <td>{row.availability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Time off">
        <h3 className="performance-section__title">Time off</h3>
        {snapshot.timeOff.length === 0 ? (
          <div className="performance-empty performance-timeoff-list">
            No upcoming time off for direct reports.
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
                <span className="performance-timeoff-item__meta">
                  {entry.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
