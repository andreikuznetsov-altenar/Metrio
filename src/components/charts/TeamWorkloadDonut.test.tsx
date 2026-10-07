import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { WorkloadRow } from "../../domain/performance";
import { TeamWorkloadDonut } from "./TeamWorkloadDonut";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="team-workload-pie-chart">{children}</div>
  ),
  Pie: ({
    children,
    onMouseEnter,
  }: {
    children: ReactNode;
    onMouseEnter?: (_: unknown, index: number) => void;
  }) => (
    <div
      data-testid="team-workload-pie"
      onMouseEnter={() => onMouseEnter?.(null, 0)}
    >
      {children}
    </div>
  ),
  Cell: () => <div data-testid="team-workload-pie-cell" />,
  Tooltip: () => null,
}));

const workload: WorkloadRow[] = [
  {
    personId: "p1",
    personName: "Ada",
    activeWork: 4,
    atRisk: 1,
    workload: "High",
    availability: "Available",
    capacityDataState: "measured",
    capacityLoadPercent: 60,
  },
  {
    personId: "p2",
    personName: "Ben",
    activeWork: 2,
    atRisk: 0,
    workload: "Normal",
    availability: "Available",
    capacityDataState: "insufficient_history",
  },
];

describe("TeamWorkloadDonut", () => {
  it("renders centered chart and workload table with sync hooks", () => {
    render(<TeamWorkloadDonut workload={workload} />);
    expect(screen.getByTestId("team-brief-workload-donut")).toBeTruthy();
    expect(screen.getByTestId("team-workload-pie-chart")).toBeTruthy();
    expect(screen.getByTestId("team-brief-workload-table")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Not enough history")).toBeTruthy();
    const row = screen.getByText("Ada").closest("tr");
    expect(row).toBeTruthy();
    fireEvent.mouseEnter(screen.getByTestId("team-workload-pie"));
    expect(row?.className).toContain("team-workload-donut__row--active");
  });
});
