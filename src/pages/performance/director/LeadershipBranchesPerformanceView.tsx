import { useMemo } from "react";
import type { LeadershipBranchPerformanceRow } from "../../../domain/organization/leadershipBranchPerformanceRows";
import { Button } from "../../../components/Button/Button";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../../components/Table/SortableTableHeader";
import { useTableSort } from "../../../components/Table/useTableSort";

const COLUMNS = [
  { id: "leader", type: "text" as const },
  { id: "scope", type: "number" as const },
  { id: "performance", type: "text" as const },
  { id: "attention", type: "text" as const },
  { id: "delivery", type: "number" as const },
  { id: "capacity", type: "text" as const },
  { id: "availability", type: "text" as const },
];

export interface LeadershipBranchesPerformanceViewProps {
  rows: LeadershipBranchPerformanceRow[];
  selectedLeaderId?: string;
  onSelectLeader: (leaderId: string) => void;
  onBack: () => void;
}

export function LeadershipBranchesPerformanceView({
  rows,
  selectedLeaderId,
  onSelectLeader,
  onBack,
}: LeadershipBranchesPerformanceViewProps) {
  const getValue = useMemo(
    () => (row: LeadershipBranchPerformanceRow, columnId: string) => {
      switch (columnId) {
        case "leader":
          return row.leaderName;
        case "scope":
          return row.peopleCount;
        case "performance":
          return row.performanceLabel;
        case "attention":
          return row.attentionLabel;
        case "delivery":
          return row.deliveryRiskCount;
        case "capacity":
          return row.capacityLabel;
        case "availability":
          return row.availabilityLabel;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(rows, COLUMNS, getValue);
  const selected = rows.find((row) => row.leaderId === selectedLeaderId);

  if (selected) {
    return (
      <div data-testid="leadership-branch-detail">
        <Button variant="ghost" onClick={onBack}>
          ← All branches
        </Button>
        <h3 className="performance-section__title">{selected.leaderName}</h3>
        {selected.leaderTitle ? (
          <p className="performance-inline-empty">{selected.leaderTitle}</p>
        ) : null}
        <dl className="performance-director-team-meta">
          <div>
            <dt>Scope</dt>
            <dd>{selected.peopleCount} people</dd>
          </div>
          <div>
            <dt>Performance</dt>
            <dd>{selected.performanceLabel}</dd>
          </div>
          <div>
            <dt>Attention</dt>
            <dd>{selected.attentionLabel}</dd>
          </div>
          <div>
            <dt>Delivery risk</dt>
            <dd>{selected.deliveryRiskCount}</dd>
          </div>
          <div>
            <dt>Capacity</dt>
            <dd>{selected.capacityLabel}</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>{selected.availabilityLabel}</dd>
          </div>
        </dl>
        <p className="performance-inline-empty">
          Open Delivery Risk or People for this branch from Signals or drill-down actions.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="leadership-branches-performance">
      <h3 className="performance-section__title">Leadership branches</h3>
      <MetrioTableWrap>
        <table className={METRIO_TABLE_CLASS}>
          <thead>
            <tr>
              <SortableTableHeader
                columnId="leader"
                label="Leader"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="scope"
                label="Scope"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="performance"
                label="Performance"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="attention"
                label="Attention"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="delivery"
                label="Delivery risk"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="capacity"
                label="Capacity"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="availability"
                label="Availability"
                sort={sort}
                onToggle={toggleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.leaderId}>
                <td>
                  <button
                    type="button"
                    className="metrio-table-link"
                    onClick={() => onSelectLeader(row.leaderId)}
                  >
                    <span className="metrio-table-link__primary">{row.leaderName}</span>
                    {row.leaderTitle ? (
                      <span className="metrio-table-link__secondary">{row.leaderTitle}</span>
                    ) : null}
                  </button>
                </td>
                <td>{row.peopleCount} people</td>
                <td>{row.performanceLabel}</td>
                <td>{row.attentionLabel}</td>
                <td>{row.deliveryRiskCount}</td>
                <td>{row.capacityLabel}</td>
                <td>{row.availabilityLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MetrioTableWrap>
    </div>
  );
}
