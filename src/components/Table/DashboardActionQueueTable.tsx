import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { PersonAvatar } from "../PersonAvatar/PersonAvatar";
import {
  dashboardQueueRowTier,
  type DashboardQueueRow,
} from "../../domain/actions/buildDashboardQueueRows";
import type { ActionItem } from "../../domain/actions/actionTypes";
import { badgeVariantForAttentionLabel } from "../../platform/attentionSemanticBadge";
import { PerformanceTableColgroup } from "./PerformanceTableColgroup";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "./MetrioTable";
import { TableWorkLead } from "./TableWorkLead";
import { JiraIssueText } from "../JiraIssueLink/JiraIssueText";
import { SortableTableHeader } from "./SortableTableHeader";
import type { TableSortState } from "./tableSort";

const QUEUE_COLGROUP = ["person", "reason", "issues", "action"] as const;

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
              <td>
                <span className="performance-table__clamp" title={row.contextLines.join(" · ")}>
                  {row.contextLines.length ? row.contextLines.join(" · ") : "—"}
                </span>
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
