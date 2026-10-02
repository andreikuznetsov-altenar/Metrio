import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Select } from "../../components/Select/Select";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { usePerformanceExport } from "../../app/PerformanceExportContext";
import { workHistoryEntryToEvidenceIssue } from "../../domain/analytics/personAnalyticsWorkspace";
import type { WorkHistoryGroupView, WorkHistoryRow } from "../../domain/performance";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";

type HistoryPeriod = "week" | "month" | "quarter";
type HistoryFilter = "all" | "first_pass" | "rework";

const HISTORY_PAGE_SIZE = 25;

export interface EmployeeWorkHistoryViewProps {
  personId: string;
  personName: string;
  historyWeek: WorkHistoryGroupView[];
  historyMonth: WorkHistoryGroupView[];
  historyQuarter: WorkHistoryGroupView[];
}

function rowMatchesFilter(row: WorkHistoryRow, filter: HistoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "first_pass") return /first pass/i.test(row.outcome);
  return /rework/i.test(row.outcome);
}

export function EmployeeWorkHistoryView({
  personId,
  personName,
  historyWeek,
  historyMonth,
  historyQuarter,
}: EmployeeWorkHistoryViewProps) {
  const [period, setPeriod] = useState<HistoryPeriod>("month");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const { registerWorkHistoryPeriod } = usePerformanceExport();

  useEffect(() => {
    registerWorkHistoryPeriod(period);
  }, [period, registerWorkHistoryPeriod]);

  useEffect(() => {
    setVisibleCount(HISTORY_PAGE_SIZE);
  }, [period, filter]);

  const groups =
    period === "week"
      ? historyWeek
      : period === "quarter"
        ? historyQuarter
        : historyMonth;

  const flatRows = useMemo(
    () =>
      groups.flatMap((group) =>
        group.rows
          .filter((row) => rowMatchesFilter(row, filter))
          .map((row) => ({ group, row })),
      ),
    [filter, groups],
  );

  const visibleRows = flatRows.slice(0, visibleCount);

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

      <SegmentedControl
        ariaLabel="History outcome filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "first_pass", label: "First pass" },
          { value: "rework", label: "Rework" },
        ]}
      />

      {flatRows.length === 0 ? (
        <p className="performance-inline-empty" role="status">
          No completed work in this period.
        </p>
      ) : (
        <>
          {groups.map((group) => {
            const groupRows = visibleRows.filter((entry) => entry.group.label === group.label);
            if (!groupRows.length) return null;
            return (
              <div key={group.label} className="person-detail-drawer__history-group">
                <h4 className="performance-subsection__title">
                  {group.label} · {group.completedCount} completed ·{" "}
                  {group.firstPassCount} first pass · {group.reviewReturns} rework
                </h4>
                <div className="person-detail-drawer__history-list">
                  {groupRows.map(({ row }) => (
                      <AnalyticsIssueRow
                        key={`${group.label}-${row.key}-${row.completedOn}`}
                        issue={workHistoryEntryToEvidenceIssue(
                          {
                            issueKey: row.key,
                            summary: row.title,
                            project: row.project,
                            completedAt: row.completedAtIso ?? "",
                            cycleMs: row.cycleMs ?? null,
                            firstPass: row.firstPass ?? null,
                            issue: {} as import("../../domain/jira/types").AuditIssue,
                          },
                          personId,
                          personName,
                        )}
                        showOutcome
                        hidePerson
                      />
                    ))}
                </div>
              </div>
            );
          })}

          {visibleCount < flatRows.length ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE)}
            >
              Show more
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
