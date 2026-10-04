import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { EntityLink } from "../../components/EntityLink/EntityLink";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import type { GroupedAttentionSignal } from "./groupAttentionSignals";

const INITIAL_KEY_COUNT = 2;

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
            const visibleKeys = showAll
              ? group.issueKeys
              : group.issueKeys.slice(0, INITIAL_KEY_COUNT);
            const hiddenCount = Math.max(0, group.issueKeys.length - visibleKeys.length);

            return (
              <tr key={rowKey}>
                <td>
                  <Badge variant={group.variant}>{group.label}</Badge>
                </td>
                <td className="performance-table__num">{group.taskCount}</td>
                <td>{group.reason}</td>
                <td>
                  {group.issueKeys.length === 0 ? (
                    "—"
                  ) : (
                    <div className="attention-signals-table__issues">
                      {visibleKeys.map((key) => (
                        <EntityLink
                          key={key}
                          href={buildJiraIssueBrowseUrl(jiraBaseUrl, key)}
                          mono
                        >
                          {key}
                        </EntityLink>
                      ))}
                      {hiddenCount > 0 ? (
                        <button
                          type="button"
                          className="attention-signals-table__more"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [rowKey]: true }))
                          }
                        >
                          View {hiddenCount} more
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </MetrioTableWrap>
  );
}
