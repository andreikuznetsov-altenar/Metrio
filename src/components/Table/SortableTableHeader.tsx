import type { ReactNode } from "react";
import type { TableSortState } from "./tableSort";

export interface SortableTableHeaderProps {
  columnId: string;
  label: ReactNode;
  sort: TableSortState;
  onToggle: (columnId: string) => void;
  className?: string;
  /** @deprecated All columns are left-aligned; ignored. */
  align?: "left" | "right";
}

function sortIndicator(sort: TableSortState, columnId: string): "↕" | "↑" | "↓" {
  if (!sort || sort.columnId !== columnId) return "↕";
  return sort.direction === "asc" ? "↑" : "↓";
}

export function SortableTableHeader({
  columnId,
  label,
  sort,
  onToggle,
  className,
}: SortableTableHeaderProps) {
  const active = sort?.columnId === columnId;
  const ariaSort =
    !active ? "none" : sort.direction === "asc" ? "ascending" : "descending";
  const indicator = sortIndicator(sort, columnId);

  return (
    <th
      className={className}
      aria-sort={ariaSort}
      scope="col"
    >
      <button
        type="button"
        className={
          active
            ? "performance-table__sort-btn is-active"
            : "performance-table__sort-btn"
        }
        onClick={() => onToggle(columnId)}
      >
        <span className="performance-table__sort-label">{label}</span>
        <span
          className={
            active
              ? "performance-table__sort-icon is-active"
              : "performance-table__sort-icon"
          }
          aria-hidden
        >
          {indicator}
        </span>
      </button>
    </th>
  );
}
