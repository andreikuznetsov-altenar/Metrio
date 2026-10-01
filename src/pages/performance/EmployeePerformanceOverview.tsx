import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { Sparkline } from "./Sparkline";
import { PerformanceStatusBanner } from "./PerformanceStatusBanner";
import "./performance-dashboard.css";

export interface EmployeePerformanceOverviewProps {
  personId: string;
  onOpenPerson: (personId: string) => void;
}

export function EmployeePerformanceOverview({
  personId,
  onOpenPerson,
}: EmployeePerformanceOverviewProps) {
  const { viewModels, status } = usePerformanceData();

  if (!viewModels?.employee && (status === "loading" || status === "idle")) {
    return (
      <div className="performance-dashboard">
        <PerformanceStatusBanner />
      </div>
    );
  }

  const snapshot = viewModels?.employee;
  if (!snapshot) {
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
    <div className="performance-dashboard">
      <PerformanceStatusBanner />
      <section aria-label="Overview">
        <div className="performance-section-head">
          <h3 className="performance-section__title performance-section__title--inline">
            Overview
          </h3>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenPerson(personId)}
          >
            My profile
          </Button>
        </div>

        <h4 className="performance-subsection__title">My metrics</h4>
        <div className="performance-metrics performance-metrics--subsection">
          {snapshot.metrics.map((metric) => (
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

        <h4 className="performance-subsection__title">Current work</h4>
        {snapshot.activeWork.length === 0 ? (
          <div className="performance-empty performance-work-list">
            No Jira work found for this period.
          </div>
        ) : (
          <div className="performance-work-list">
            {snapshot.activeWork.map((item) => (
              <div key={item.key} className="performance-work-row">
                <div className="performance-work-row__key">{item.key}</div>
                <div className="performance-work-row__main">
                  <div className="performance-work-row__title">{item.title}</div>
                  <div className="performance-work-row__meta">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h4 className="performance-subsection__title">Needs attention</h4>
        {snapshot.attention.length === 0 ? (
          <div className="performance-empty performance-work-list">
            Nothing needs your attention right now.
          </div>
        ) : (
          <div className="performance-work-list">
            {snapshot.attention.map((item) => (
              <div key={item.reason} className="performance-work-row">
                <div className="performance-work-row__main">
                  <div className="performance-attention-row__badges">
                    <Badge variant={item.variant}>{item.label}</Badge>
                  </div>
                  <div className="performance-work-row__meta">{item.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h4 className="performance-subsection__title">Upcoming time off</h4>
        {snapshot.timeOff ? (
          <ul className="performance-timeoff-list">
            <li className="performance-timeoff-item">
              <span className="performance-timeoff-item__meta">
                {snapshot.timeOff.rangeLabel}
              </span>
              <span className="performance-timeoff-item__meta">
                {snapshot.timeOff.note}
              </span>
            </li>
          </ul>
        ) : (
          <div className="performance-empty performance-timeoff-list">
            No upcoming time off scheduled.
          </div>
        )}
      </section>

      <section aria-label="Trends">
        <h3 className="performance-section__title">Trends</h3>
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

      <section aria-label="Work history">
        <h3 className="performance-section__title">Work history</h3>
        {snapshot.history.length === 0 ? (
          <div className="performance-empty performance-table-wrap">
            No Jira work found for this period.
          </div>
        ) : (
          <div className="performance-table-wrap">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Completed</th>
                  <th>Cycle</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <div className="performance-work-row__key">{row.key}</div>
                      <div className="performance-work-row__title">
                        {row.title}
                      </div>
                    </td>
                    <td>{row.completedOn}</td>
                    <td>{row.cycle}</td>
                    <td>{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
