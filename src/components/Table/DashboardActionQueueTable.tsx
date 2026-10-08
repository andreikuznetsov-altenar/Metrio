import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { PersonAvatar } from "../PersonAvatar/PersonAvatar";
import {
  dashboardQueueRowTier,
  type DashboardQueueRow,
} from "../../domain/actions/buildDashboardQueueRows";
import type { ActionItem } from "../../domain/actions/actionTypes";
import {
  queueTaskCountExtraContext,
  shouldLinkQueueTaskCount,
  uniqueIssueKeysForAction,
} from "../../domain/actions/dashboardQueueTaskCount";
import type { Person } from "../../domain/people/types";
import { badgeVariantForAttentionLabel } from "../../platform/attentionSemanticBadge";
import { GroupedIssuePreview } from "../GroupedIssuePreview/GroupedIssuePreview";
import { PerformanceTableColgroup } from "./PerformanceTableColgroup";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "./MetrioTable";
import { TableWorkLead } from "./TableWorkLead";
import { JiraIssueText } from "../JiraIssueLink/JiraIssueText";
import { SortableTableHeader } from "./SortableTableHeader";
import type { TableSortState } from "./tableSort";

const QUEUE_COLGROUP = ["person", "reason", "issues", "action"] as const;

function QueueContextCell({
  row,
  jiraBaseUrl,
  teamPersons,
  onOpenJiraIssue,
}: {
  row: DashboardQueueRow;
  jiraBaseUrl: string;
  teamPersons: Person[];
  onOpenJiraIssue?: (issueKey: string, url?: string) => void;
}) {
  const title = row.contextLines.join(" · ");
  if (!shouldLinkQueueTaskCount(row.item, row.contextLines)) {
    return (
      <span className="performance-table__clamp" title={title}>
        {row.contextLines.length ? title : "—"}
      </span>
    );
  }

  const extra = queueTaskCountExtraContext(row.contextLines);
  return (
    <span
      className="performance-table__clamp performance-table__context-with-count"
      title={title}
    >
      <GroupedIssuePreview
        issueKeys={uniqueIssueKeysForAction(row.item)}
        jiraBaseUrl={jiraBaseUrl}
        persons={teamPersons}
        modalTitle={row.subject}
        onOpenIssue={onOpenJiraIssue}
      />
      {extra.length ? (
        <span className="performance-table__context-extra">
          {" · "}
          {extra.join(" · ")}
        </span>
      ) : null}
    </span>
  );
}

export interface DashboardActionQueueTableProps {
  workColumnLabel: string;
  rows: DashboardQueueRow[];
  onOpen: (item: ActionItem) => void;
  openLabel: (item: ActionItem) => string;
  sortColumnId: string | null;
  sortDirection: "asc" | "desc" | null;
  onToggleSort: (columnId: string) => void;
  jiraBaseUrl?: string;
  /** When false, headers are plain text with no sort affordance. */
  sortable?: boolean;
  teamPersons?: Person[];
  onOpenJiraIssue?: (issueKey: string, url?: string) => void;
}

export function DashboardActionQueueTable({
  workColumnLabel,
  rows,
  onOpen,
  openLabel,
  sortColumnId,
  sortDirection,
  onToggleSort,
  jiraBaseUrl = "",
  sortable = true,
  teamPersons = [],
  onOpenJiraIssue,
}: DashboardActionQueueTableProps) {
  const renderWorkLabel = (row: DashboardQueueRow) => (
    <JiraIssueText text={row.subject} jiraBaseUrl={jiraBaseUrl} />
  );
  const headerColumns = [
    { id: "work", label: workColumnLabel },
    { id: "reason", label: "Reason" },
    { id: "context", label: "Context" },
    { id: "action", label: "Action" },
  ] as const;
  const sort: TableSortState =
    sortColumnId && sortDirection
      ? { columnId: sortColumnId, direction: sortDirection }
      : null;

  return (
    <MetrioTableWrap testId="dashboard-action-queue-table">
      <table
        className={`${METRIO_TABLE_CLASS} performance-table--action-queue`}
        data-testid="dashboard-action-queue"
      >
        <PerformanceTableColgroup columns={[...QUEUE_COLGROUP]} />
        <thead>
          <tr>
            {headerColumns.map((col) =>
              !sortable || col.id === "action" ? (
                <th
                  key={col.id}
                  scope="col"
                  className={col.id === "action" ? "performance-table__action" : undefined}
                >
                  <span className="performance-table__sort-label">{col.label}</span>
                </th>
              ) : (
                <SortableTableHeader
                  key={col.id}
                  columnId={col.id}
                  label={
                    col.id === "work" ? <TableWorkLead label={col.label} /> : col.label
                  }
                  sort={sort}
                  onToggle={onToggleSort}
                />
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              data-testid="dashboard-action-row"
              data-row-tier={
                dashboardQueueRowTier(row.item) === 0
                  ? "grouped"
                  : dashboardQueueRowTier(row.item) === 2
                    ? "person"
                    : "task"
              }
            >
              <td>
                <TableWorkLead
                  label={renderWorkLabel(row)}
                  media={
                    row.item.personId && row.item.personName ? (
                      <PersonAvatar
                        personId={row.item.personId}
                        displayName={row.item.personName}
                        size="sm"
                      />
                    ) : undefined
                  }
                />
              </td>
              <td data-testid="dashboard-action-tag-cell">
                <div className="performance-table__tag-stack">
                  {row.reasonTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={badgeVariantForAttentionLabel(tag)}
                      className="performance-table__inline-badge"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </td>
              <td data-testid="dashboard-action-context-cell">
                <QueueContextCell
                  row={row}
                  jiraBaseUrl={jiraBaseUrl}
                  teamPersons={teamPersons}
                  onOpenJiraIssue={onOpenJiraIssue}
                />
              </td>
              <td className="performance-table__action" data-testid="dashboard-action-cta-cell">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpen(row.item)}
                >
                  {openLabel(row.item)}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </MetrioTableWrap>
  );
}
