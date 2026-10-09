import type { ReactNode } from "react";
import type { TableSortState } from "./tableSort";

export interface TableHeaderCellProps {
  columnId: string;
  label: ReactNode;
  /** When true, renders sort control + indicators. When false, static header chrome only. */
  sortable?: boolean;
  sort?: TableSortState;
  onToggle?: (columnId: string) => void;
  className?: string;
  /** @deprecated All columns are left-aligned; ignored. */
  align?: "left" | "right";
}

function sortIndicator(sort: TableSortState, columnId: string): "↕" | "↑" | "↓" {
  if (!sort || sort.columnId !== columnId) return "↕";
  return sort.direction === "asc" ? "↑" : "↓";
}

/**
 * Canonical table header cell. Sortable and static modes share the same
 * header-inner chrome; only sort affordances differ.
 */
export function TableHeaderCell({
  columnId,
  label,
  sortable = false,
  sort = null,
  onToggle,
  className,
}: TableHeaderCellProps) {
  const active = Boolean(sortable && sort?.columnId === columnId);
  const ariaSort = !sortable
    ? undefined
    : !active
      ? "none"
      : sort!.direction === "asc"
        ? "ascending"
        : "descending";

  const labelNode = (
    <span className="performance-table__sort-label">{label}</span>
  );

  const innerClass = sortable
    ? active
      ? "performance-table__header-inner performance-table__sort-btn is-active"
      : "performance-table__header-inner performance-table__sort-btn"
    : "performance-table__header-inner";

  return (
    <th
      className={className}
      scope="col"
      aria-sort={ariaSort}
      data-table-header-cell=""
      data-sortable={sortable ? "true" : "false"}
    >
      {sortable ? (
        <button
          type="button"
          className={innerClass}
          onClick={() => onToggle?.(columnId)}
        >
          {labelNode}
          <span
            className={
              active
                ? "performance-table__sort-icon is-active"
                : "performance-table__sort-icon"
            }
            aria-hidden
          >
            {sortIndicator(sort, columnId)}
          </span>
        </button>
      ) : (
        <span className={innerClass}>{labelNode}</span>
      )}
    </th>
  );
}
