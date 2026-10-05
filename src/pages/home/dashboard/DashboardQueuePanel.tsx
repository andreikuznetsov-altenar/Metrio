import { useMemo } from "react";
import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { PersonAvatar } from "../../../components/PersonAvatar/PersonAvatar";
import { SortableTableHeader } from "../../../components/Table/SortableTableHeader";
import { useTableSort } from "../../../components/Table/useTableSort";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import { buildDashboardActionRow } from "../../../domain/actions/actionPresentation";
import { badgeVariantForAttentionLabel } from "../../../platform/attentionSemanticBadge";

const QUEUE_COLUMNS = [
  { id: "work", type: "text" as const },
  { id: "reason", type: "text" as const },
  { id: "status", type: "text" as const },
  { id: "action", type: "text" as const },
];

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
  const getValue = useMemo(
    () => (item: ActionItem, columnId: string) => {
      const row = buildDashboardActionRow(item);
      switch (columnId) {
        case "work":
          return row.subject;
        case "reason":
          return row.reasonTag;
        case "status":
          return row.contextLine || row.statusLabel || "";
        case "action":
          return openLabel(item);
        default:
          return "";
      }
    },
    [openLabel],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(items, QUEUE_COLUMNS, getValue);

  return (
    <section
      className="executive-panel executive-panel--flush"
      aria-label={title}
      data-testid={testId}
    >
      <h2 className="executive-panel__title">{title}</h2>
      {items.length === 0 ? (
        <p className="executive-secondary-line" role="status">{emptyMessage}</p>
      ) : (
        <table className="executive-queue-table">
          <thead>
            <tr>
              <SortableTableHeader
                columnId="work"
                label={workColumnLabel}
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="reason"
                label="Reason"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="status"
                label="Status"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="action"
                label="Action"
                sort={sort}
                onToggle={toggleSort}
                className="executive-queue-table__cta"
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((item) => {
              const row = buildDashboardActionRow(item);
              return (
                <tr key={item.id} data-testid="dashboard-action-row">
                  <td>
                    <div className="executive-queue-table__work">
                      {item.personId && item.personName ? (
                        <PersonAvatar
                          personId={item.personId}
                          displayName={item.personName}
                          size="sm"
                        />
                      ) : null}
                      {row.subject}
                    </div>
                  </td>
                  <td>
                    <Badge variant={badgeVariantForAttentionLabel(row.reasonTag)}>
                      {row.reasonTag}
                    </Badge>
                  </td>
                  <td className="executive-queue-table__context">
                    {row.contextLine || row.statusLabel || "—"}
                  </td>
                  <td className="executive-queue-table__cta">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onOpen(item)}
                    >
                      {openLabel(item)}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
