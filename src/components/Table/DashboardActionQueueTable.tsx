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

const QUEUE_COLGROUP = ["person", "reason", "issues", "action"] as const;

function sortMark(active: boolean, direction: "asc" | "desc" | null): string {
  if (!active || !direction) return "↕";
  return direction === "asc" ? "↑" : "↓";
}

export interface DashboardActionQueueTableProps {
  workColumnLabel: string;
  rows: DashboardQueueRow[];
  onOpen: (item: ActionItem) => void;
  openLabel: (item: ActionItem) => string;
  sortColumnId: string | null;
  sortDirection: "asc" | "desc" | null;
  onToggleSort: (columnId: string) => void;
}

export function DashboardActionQueueTable({
  workColumnLabel,
  rows,
  onOpen,
  openLabel,
  sortColumnId,
  sortDirection,
  onToggleSort,
}: DashboardActionQueueTableProps) {
  const headerColumns = [
    { id: "work", label: workColumnLabel },
    { id: "reason", label: "Reason" },
    { id: "context", label: "Context" },
    { id: "action", label: "Action" },
  ] as const;

  return (
    <MetrioTableWrap testId="dashboard-action-queue-table">
      <table
        className={`${METRIO_TABLE_CLASS} performance-table--action-queue`}
        data-testid="dashboard-action-queue"
      >
        <PerformanceTableColgroup columns={[...QUEUE_COLGROUP]} />
        <thead>
          <tr>
            {headerColumns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={col.id === "action" ? "performance-table__action" : undefined}
              >
                {col.id === "action" ? (
                  <span className="performance-table__sort-label">{col.label}</span>
                ) : (
                  <button
                    type="button"
                    className={
                      sortColumnId === col.id
                        ? "performance-table__sort-btn is-active"
                        : "performance-table__sort-btn"
                    }
                    onClick={() => onToggleSort(col.id)}
                    aria-sort={
                      sortColumnId === col.id
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <span className="performance-table__sort-label">
                      {col.id === "work" ? (
                        <TableWorkLead label={col.label} />
                      ) : (
                        col.label
                      )}
                    </span>
                    <span className="performance-table__sort-icon" aria-hidden>
                      {sortMark(sortColumnId === col.id, sortDirection)}
                    </span>
                  </button>
                )}
              </th>
            ))}
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
                  label={row.subject}
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
