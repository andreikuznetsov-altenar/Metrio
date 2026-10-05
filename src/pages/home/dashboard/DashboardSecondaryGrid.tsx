import { Children, type ReactNode } from "react";

export interface DashboardSecondaryGridProps {
  children: ReactNode;
}

/** Goal reviews + Team brief share one responsive secondary row. */
export function DashboardSecondaryGrid({ children }: DashboardSecondaryGridProps) {
  const items = Children.toArray(children).filter(Boolean);
  const count = items.length;
  if (count === 0) return null;

  const layoutClass =
    count >= 2
      ? "executive-dashboard__secondary executive-dashboard__secondary--pair"
      : "executive-dashboard__secondary executive-dashboard__secondary--single";

  return (
    <div className={layoutClass} data-testid="dashboard-secondary-grid">
      {items}
    </div>
  );
}
