import type { ReactNode } from "react";

export function DashboardLowerThreeCards({ children }: { children: ReactNode }) {
  return (
    <div
      className="executive-dashboard__span-12 executive-lower-three"
      data-testid="dashboard-lower-three-cards"
    >
      {children}
    </div>
  );
}
