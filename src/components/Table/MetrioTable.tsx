import type { ReactNode } from "react";

/** Shared table surface classes — keep in sync with `ui-interaction-system.css`. */
export const METRIO_TABLE_CLASS =
  "performance-table performance-table--interactive";

export interface MetrioTableWrapProps {
  children: ReactNode;
  className?: string;
  testId?: string;
}

export function MetrioTableWrap({ children, className, testId }: MetrioTableWrapProps) {
  return (
    <div
      className={["performance-table-wrap", className].filter(Boolean).join(" ")}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export interface TableClampCellProps {
  children: ReactNode;
  lines?: 2 | 3;
  title?: string;
  className?: string;
  align?: "left" | "right";
}

export function TableClampCell({
  children,
  lines = 2,
  title,
  className,
  align,
}: TableClampCellProps) {
  const clampClass =
    lines === 3 ? "performance-table__cell--clamp-3" : "performance-table__cell--clamp-2";
  const textTitle =
    title ?? (typeof children === "string" || typeof children === "number" ? String(children) : undefined);

  return (
    <td
      className={[
        clampClass,
        align === "right" ? "performance-table__num" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="performance-table__clamp" title={textTitle}>
        {children}
      </span>
    </td>
  );
}
