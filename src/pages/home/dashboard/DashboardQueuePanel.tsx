import { useMemo } from "react";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import {
  buildDashboardQueueRows,
  reasonTagSortRank,
  type DashboardQueueRow,
} from "../../../domain/actions/buildDashboardQueueRows";
import { DashboardActionQueueRows } from "../../performance/DashboardActionQueueRows";
import { Button } from "../../../components/Button/Button";
import { useTableSort } from "../../../components/Table/useTableSort";
import "../../performance/action-queue.css";

const QUEUE_COLUMNS = [
  { id: "work", type: "text" as const },
  { id: "reason", type: "number" as const },
  { id: "context", type: "text" as const },
  { id: "action", type: "text" as const },
];

function sortMark(active: boolean, direction: "asc" | "desc" | null): string {
  if (!active || !direction) return "↕";
  return direction === "asc" ? "↑" : "↓";
}

export interface DashboardQueuePanelProps {
  title: string;
  workColumnLabel: string;
  items: ActionItem[];
  emptyMessage: string;
  onOpen: (item: ActionItem) => void;
  openLabel: (item: ActionItem) => string;
  footerAction?: { label: string; onClick: () => void };
  testId?: string;
}

export function DashboardQueuePanel({
  title,
  workColumnLabel,
  items,
  emptyMessage,
  onOpen,
  openLabel,
  footerAction,
  testId,
}: DashboardQueuePanelProps) {
  const mergedRows = useMemo(() => buildDashboardQueueRows(items), [items]);

  const getValue = useMemo(
    () => (row: DashboardQueueRow, columnId: string) => {
      switch (columnId) {
        case "work":
          return row.subject;
        case "reason":
          return reasonTagSortRank(row.reasonTags);
        case "context":
          return row.contextLines.join(" ");
        case "action":
          return openLabel(row.item);
        default:
          return "";
      }
    },
    [openLabel],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(mergedRows, QUEUE_COLUMNS, getValue);

  return (
    <section
      className="executive-panel executive-panel--flush action-queue--dashboard"
      aria-label={title}
      data-testid={testId}
    >
      <h2 className="executive-panel__title">{title}</h2>
      {items.length === 0 ? (
        <p className="executive-secondary-line" role="status">{emptyMessage}</p>
      ) : (
        <>
          <div className="action-queue__dashboard-header" role="row">
            {(
              [
                { id: "work", label: workColumnLabel, alignEnd: false },
                { id: "reason", label: "Reason", alignEnd: false },
                { id: "context", label: "Context", alignEnd: false },
                { id: "action", label: "Action", alignEnd: true },
              ] as const
            ).map((col) => (
              <button
                key={col.id}
                type="button"
                className={[
                  "action-queue__dashboard-header-cell",
                  col.alignEnd ? "action-queue__dashboard-header-cell--end" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => toggleSort(col.id)}
                aria-sort={
                  sort?.columnId === col.id
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <span>{col.label}</span>
                <span aria-hidden>{sortMark(sort?.columnId === col.id, sort?.direction ?? null)}</span>
              </button>
            ))}
          </div>
          <DashboardActionQueueRows
            rows={sortedRows}
            onOpen={onOpen}
            openLabel={openLabel}
          />
        </>
      )}
      {footerAction ? (
        <div className="home-card__actions">
          <Button type="button" variant="secondary" onClick={footerAction.onClick}>
            {footerAction.label}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
