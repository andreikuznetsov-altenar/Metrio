export type PerformanceTableColumnWidth =
  | "person"
  | "reason"
  | "issues"
  | "num"
  | "badge"
  | "action";

const COL_CLASS: Record<PerformanceTableColumnWidth, string> = {
  person: "col-person",
  reason: "col-reason",
  issues: "col-issues",
  num: "col-num",
  badge: "col-badge",
  action: "col-action",
};

export function PerformanceTableColgroup({
  columns,
}: {
  columns: PerformanceTableColumnWidth[];
}) {
  return (
    <colgroup>
      {columns.map((col, index) => (
        <col key={`${col}-${index}`} className={COL_CLASS[col]} />
      ))}
    </colgroup>
  );
}

export function performanceTableClass(...modifiers: string[]): string {
  return ["performance-table", "performance-table--interactive", ...modifiers]
    .filter(Boolean)
    .join(" ");
}
