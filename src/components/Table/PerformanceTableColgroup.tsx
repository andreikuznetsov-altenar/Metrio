export type PerformanceTableColumnWidth =
  | "person"
  | "reason"
  | "issues"
  | "issueKey"
  | "title"
  | "date"
  | "num"
  | "badge"
  | "status"
  | "action";

const COL_CLASS: Record<PerformanceTableColumnWidth, string> = {
  person: "col-person",
  reason: "col-reason",
  issues: "col-issues",
  issueKey: "col-issue-key",
  title: "col-title",
  date: "col-date",
  num: "col-num",
  badge: "col-badge",
  status: "col-status",
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
