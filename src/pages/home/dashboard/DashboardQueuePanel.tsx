import { useEffect, useMemo, useState } from "react";
import { loadPreferences } from "../../../platform/preferences";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import {
  buildDashboardQueueRows,
  reasonTagSortRank,
  stabilizeDashboardQueueRowOrder,
  type DashboardQueueRow,
} from "../../../domain/actions/buildDashboardQueueRows";
import { buildTaskListModalRows } from "../../../domain/actions/buildTaskListModalRows";
import type { Person } from "../../../domain/people/types";
import { DashboardActionQueueTable } from "../../../components/Table/DashboardActionQueueTable";
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
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);
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
  const displayRows = useMemo(
    () => stabilizeDashboardQueueRowOrder(sortedRows),
    [sortedRows],
  );
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
          <DashboardActionQueueTable
            workColumnLabel={workColumnLabel}
            rows={displayRows}
            onOpen={onOpen}
            openLabel={openLabel}
            sortColumnId={sort?.columnId ?? null}
            sortDirection={sort?.direction ?? null}
            onToggleSort={toggleSort}
            jiraBaseUrl={jiraBaseUrl}
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
