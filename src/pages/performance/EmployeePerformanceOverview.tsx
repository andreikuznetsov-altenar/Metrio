import { useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import type { EmployeePerformanceView } from "../../domain/performance";
import { EmployeeMyWeekView } from "./EmployeeMyWeekView";
import { EmployeePerformanceSubnav } from "./EmployeePerformanceSubnav";
import { EmployeeTrendsView } from "./EmployeeTrendsView";
import { EmployeeWorkHistoryView } from "./EmployeeWorkHistoryView";
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
  const [activeView, setActiveView] =
    useState<EmployeePerformanceView>("overview");
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
      <EmployeePerformanceSubnav activeView={activeView} onChange={setActiveView} />

      {activeView === "overview" ? (
        <>
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
        </>
      ) : null}

      {activeView === "my-week" ? (
        <EmployeeMyWeekView myWeek={snapshot.myWeek} />
      ) : null}

      {activeView === "trends" ? (
        <EmployeeTrendsView trends={snapshot.trends} />
      ) : null}

      {activeView === "work-history" ? (
        <EmployeeWorkHistoryView
          historyWeek={snapshot.historyWeek}
          historyMonth={snapshot.historyMonth}
          historyQuarter={snapshot.historyQuarter}
        />
      ) : null}
    </div>
  );
}
