import { useEffect, useState } from "react";
import { Select } from "../../components/Select/Select";
import { usePerformanceExport } from "../../app/PerformanceExportContext";
import type { WorkHistoryGroupView } from "../../domain/performance";

type HistoryPeriod = "week" | "month" | "quarter";

export interface EmployeeWorkHistoryViewProps {
  historyWeek: WorkHistoryGroupView[];
  historyMonth: WorkHistoryGroupView[];
  historyQuarter: WorkHistoryGroupView[];
}

export function EmployeeWorkHistoryView({
  historyWeek,
  historyMonth,
  historyQuarter,
}: EmployeeWorkHistoryViewProps) {
  const [period, setPeriod] = useState<HistoryPeriod>("month");
  const { registerWorkHistoryPeriod } = usePerformanceExport();

  useEffect(() => {
    registerWorkHistoryPeriod(period);
  }, [period, registerWorkHistoryPeriod]);
  const groups =
    period === "week"
      ? historyWeek
      : period === "quarter"
        ? historyQuarter
        : historyMonth;

  return (
    <section aria-label="Work history">
      <div className="performance-section-head">
        <h3 className="performance-section__title performance-section__title--inline">
          Work history
        </h3>
        <Select
          aria-label="History period"
          value={period}
          options={[
            { value: "week", label: "By week" },
            { value: "month", label: "By month" },
            { value: "quarter", label: "By quarter" },
          ]}
          onChange={(event) => setPeriod(event.target.value as HistoryPeriod)}
        />
      </div>

      {groups.length === 0 ? (
        <div className="performance-empty performance-table-wrap">
          No Jira work found for this period.
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="performance-table-wrap">
            <h4 className="performance-subsection__title">
              {group.label} · {group.completedCount} completed ·{" "}
              {group.firstPassCount} first pass · {group.reviewReturns} returns
            </h4>
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Project</th>
                  <th>Completed</th>
                  <th>Cycle</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={`${group.label}-${row.key}`}>
                    <td>
                      <div className="performance-work-row__key">{row.key}</div>
                      <div className="performance-work-row__title">
                        {row.title}
                      </div>
                    </td>
                    <td>{row.project}</td>
                    <td>{row.completedOn}</td>
                    <td>{row.cycle}</td>
                    <td>{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  );
}
