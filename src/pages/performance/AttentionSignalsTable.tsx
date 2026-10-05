import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import type { GroupedAttentionSignal } from "./groupAttentionSignals";
import { AttentionIssueLinks } from "./AttentionIssueLinks";

const SIGNAL_COLUMNS = [
  { id: "signal", type: "text" as const },
  { id: "tasks", type: "number" as const },
  { id: "reason", type: "text" as const },
  { id: "issues", type: "number" as const },
];

export interface AttentionSignalsTableProps {
  groups: GroupedAttentionSignal[];
  jiraBaseUrl: string;
}

export function AttentionSignalsTable({
  groups,
  jiraBaseUrl,
}: AttentionSignalsTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const getValue = useMemo(
    () => (row: GroupedAttentionSignal, columnId: string) => {
      switch (columnId) {
        case "signal":
          return row.label;
        case "tasks":
          return row.taskCount;
        case "reason":
          return row.reason;
        case "issues":
          return row.issueKeys.length;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(groups, SIGNAL_COLUMNS, getValue);

  return (
    <MetrioTableWrap testId="attention-signals-table">
      <table className={`${METRIO_TABLE_CLASS} performance-table--attention-signals`}>
        <thead>
          <tr>
            <SortableTableHeader columnId="signal" label="Signal" sort={sort} onToggle={toggleSort} />
            <SortableTableHeader
              columnId="tasks"
              label="Tasks"
              sort={sort}
              onToggle={toggleSort}
              className="performance-table__num"
              align="right"
            />
            <SortableTableHeader columnId="reason" label="Reason" sort={sort} onToggle={toggleSort} />
            <SortableTableHeader
              columnId="issues"
              label="Issues"
              sort={sort}
              onToggle={toggleSort}
              className="performance-table__num"
              align="right"
            />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((group) => {
            const rowKey = `${group.label}-${group.reason}`;
            const showAll = expanded[rowKey];

            return (
              <tr key={rowKey}>
                <td>
                  <Badge variant={group.variant}>{group.label}</Badge>
                </td>
                <td className="performance-table__num">{group.taskCount}</td>
                <td>{group.reason}</td>
                <td>
                  <AttentionIssueLinks
                    issueKeys={group.issueKeys}
                    jiraBaseUrl={jiraBaseUrl}
                    expanded={showAll}
                    onExpand={() =>
                      setExpanded((prev) => ({ ...prev, [rowKey]: true }))
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </MetrioTableWrap>
  );
}
