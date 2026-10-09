export interface TableActionsHeaderProps {
  className?: string;
}

/** Non-sortable action column header (visual blank, accessible label). */
export function TableActionsHeader({ className }: TableActionsHeaderProps) {
  return (
    <th
      scope="col"
      className={className}
      aria-label="Actions"
      data-table-header-cell=""
      data-sortable="false"
    >
      <span
        className="performance-table__header-inner performance-table__action-header-mark"
        aria-hidden="true"
      />
    </th>
  );
}
