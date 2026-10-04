import type { TableSortState } from "./tableSort";

export interface SortableTableHeaderProps {
  columnId: string;
  label: string;
  sort: TableSortState;
  onToggle: (columnId: string) => void;
  className?: string;
  align?: "left" | "right";
}

function sortIndicator(sort: TableSortState, columnId: string): string {
  if (!sort || sort.columnId !== columnId) return "↕";
  return sort.direction === "asc" ? "↑" : "↓";
}

export function SortableTableHeader({
  columnId,
  label,
  sort,
  onToggle,
  className,
  align = "left",
}: SortableTableHeaderProps) {
  const active = sort?.columnId === columnId;
  const ariaSort =
    !active ? "none" : sort.direction === "asc" ? "ascending" : "descending";

  return (
    <th
      className={className}
      aria-sort={ariaSort}
      style={align === "right" ? { textAlign: "right" } : undefined}
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
        <span>{label}</span>
        <span className="performance-table__sort-icon" aria-hidden>
          {sortIndicator(sort, columnId)}
        </span>
      </button>
    </th>
  );
}
