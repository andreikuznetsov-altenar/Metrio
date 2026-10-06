import type { ReactNode } from "react";

export function DashboardMetricsPair({ children }: { children: ReactNode }) {
  return (
    <div
      className="executive-dashboard__span-12 executive-metrics-pair"
      data-testid="dashboard-capacity-delivery-row"
    >
      {children}
    </div>
  );
}
