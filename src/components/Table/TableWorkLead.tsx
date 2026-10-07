import type { ReactNode } from "react";

export interface TableWorkLeadProps {
  label: ReactNode;
  media?: ReactNode;
}

/** Fixed-width media gutter so grouped and avatar rows share the same text start. */
export function TableWorkLead({ label, media }: TableWorkLeadProps) {
  return (
    <div className="performance-table__work-lead">
      <span className="performance-table__work-lead-media">
        {media ?? <span className="performance-table__work-lead-slot" aria-hidden />}
      </span>
      <span className="performance-table__work-lead-label">{label}</span>
    </div>
  );
}
