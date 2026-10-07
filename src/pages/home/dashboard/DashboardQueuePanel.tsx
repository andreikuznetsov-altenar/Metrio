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
import { useOptionalPerformanceIssueCatalog } from "../../../app/PerformanceIssueCatalogContext";
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
  sortable?: boolean;
  jiraBaseUrl?: string;
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
  sortable = true,
  jiraBaseUrl: jiraBaseUrlProp,
}: DashboardQueuePanelProps) {
  const issueCatalog = useOptionalPerformanceIssueCatalog();
  const [tasksOpen, setTasksOpen] = useState(false);
  const [jiraBaseUrl, setJiraBaseUrl] = useState(jiraBaseUrlProp ?? "");

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);
  const sourceItems = useMemo(() => {
    if (readDashboardVisualQueryFlag("visualDashboardUnsortedFocus")) {
      return [
        {
          id: "visual-focus-c",
          kind: "task_attention",
          severity: "warning",
          title: "UX-300",
          description: "No activity",
          issueKeys: ["UX-300"],
          target: { kind: "jira", issueKey: "UX-300" },
          source: "jira",
        },
        {
          id: "visual-focus-a",
          kind: "task_attention",
          severity: "warning",
          title: "UX-100",
          description: "Blocked",
          issueKeys: ["UX-100"],
          target: { kind: "jira", issueKey: "UX-100" },
          source: "jira",
        },
        {
          id: "visual-focus-b",
          kind: "task_attention",
          severity: "warning",
          title: "UX-200",
          description: "Long Review",
          issueKeys: ["UX-200"],
          target: { kind: "jira", issueKey: "UX-200" },
          source: "jira",
        },
      ] satisfies ActionItem[];
    }
    if (
      readDashboardVisualQueryFlag("visualDashboardIssueLink") &&
      items.length === 0
    ) {
      return [
        {
          id: "visual-my-focus-issue-link",
          kind: "task_attention",
          severity: "warning",
          title: "Review UX-5808",
          description: "Deterministic Jira-link acceptance fixture.",
          issueKeys: ["UX-5808"],
          target: { kind: "jira", issueKey: "UX-5808" },
          source: "jira",
        } satisfies ActionItem,
      ];
    }
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

  const { sortedRows, sort, toggleSort } = useTableSort(
    previewRows,
    QUEUE_COLUMNS,
    getValue,
  );
  const displayRows = useMemo(
    () => (sort ? sortedRows : stabilizeDashboardQueueRowOrder(sortedRows)),
    [sort, sortedRows],
  );
  const taskRows = useMemo(
    () =>
      buildTaskListModalRows(
        sourceItems,
        teamPersons,
        resolveJiraBaseUrl(),
        issueCatalog,
      ),
    [sourceItems, teamPersons, issueCatalog],
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
            sortColumnId={sortable ? sort?.columnId ?? null : null}
            sortDirection={sortable ? sort?.direction ?? null : null}
            onToggleSort={sortable ? toggleSort : () => undefined}
            jiraBaseUrl={jiraBaseUrl}
            sortable={sortable}
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
