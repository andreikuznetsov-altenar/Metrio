import { useMemo, useState } from "react";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import {
  buildDashboardQueueRows,
  reasonTagSortRank,
  type DashboardQueueRow,
} from "../../../domain/actions/buildDashboardQueueRows";
import { buildTaskListModalRows } from "../../../domain/actions/buildTaskListModalRows";
import type { Person } from "../../../domain/people/types";
import { DashboardActionQueueRows } from "../../performance/DashboardActionQueueRows";
import { Button } from "../../../components/Button/Button";
import { TaskListModal } from "../../../components/TaskListModal/TaskListModal";
import { useTableSort } from "../../../components/Table/useTableSort";
import { resolveJiraBaseUrl } from "../../../config/product";
import {
  readDashboardVisualQueryFlag,
} from "../../../fixtures/dashboardVisualOverrides";
import "../../performance/action-queue.css";

const QUEUE_COLUMNS = [
  { id: "work", type: "text" as const },
  { id: "reason", type: "number" as const },
  { id: "context", type: "text" as const },
  { id: "action", type: "text" as const },
];

const PREVIEW_COUNT = 5;

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
  teamPersons?: Person[];
  onOpenJiraIssue?: (issueKey: string, url?: string) => void;
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
  teamPersons = [],
  onOpenJiraIssue,
  testId,
}: DashboardQueuePanelProps) {
  const [tasksOpen, setTasksOpen] = useState(false);
  const sourceItems = useMemo(() => {
    if (
      readDashboardVisualQueryFlag("visualDashboardTaskModal") &&
      items.length > 0 &&
      items.length <= PREVIEW_COUNT
    ) {
      return Array.from({ length: PREVIEW_COUNT + 3 }, (_, index) => {
        const base = items[index % items.length];
        return { ...base, id: `${base.id}-visual-${index}` };
      });
    }
    return items;
  }, [items]);
  const mergedRows = useMemo(() => buildDashboardQueueRows(sourceItems), [sourceItems]);
  const previewRows = useMemo(
    () => mergedRows.slice(0, PREVIEW_COUNT),
    [mergedRows],
  );

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

  const { sortedRows, sort, toggleSort } = useTableSort(previewRows, QUEUE_COLUMNS, getValue);
  const taskRows = useMemo(
    () => buildTaskListModalRows(sourceItems, teamPersons, resolveJiraBaseUrl()),
    [sourceItems, teamPersons],
  );

  return (
    <section
      className="executive-panel executive-panel--flush action-queue--dashboard"
      aria-label={title}
      data-testid={testId}
    >
      <h2 className="executive-panel__title">{title}</h2>
      {sourceItems.length === 0 ? (
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
                <span className="performance-table__sort-icon" aria-hidden>
                  {sortMark(sort?.columnId === col.id, sort?.direction ?? null)}
                </span>
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
      {sourceItems.length > PREVIEW_COUNT ? (
        <div className="home-card__actions">
          <Button type="button" variant="secondary" onClick={() => setTasksOpen(true)}>
            Show {sourceItems.length} tasks
          </Button>
        </div>
      ) : null}
      {footerAction && sourceItems.length <= PREVIEW_COUNT ? (
        <div className="home-card__actions">
          <Button type="button" variant="secondary" onClick={footerAction.onClick}>
            {footerAction.label}
          </Button>
        </div>
      ) : null}
      <TaskListModal
        open={tasksOpen}
        onClose={() => setTasksOpen(false)}
        title={title}
        rows={taskRows}
        onOpenIssue={
          onOpenJiraIssue
            ? (issueKey, url) => {
                onOpenJiraIssue(issueKey, url);
              }
            : undefined
        }
      />
    </section>
  );
}
