import { fireEvent, render, screen, within } from "@testing-library/react";
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
    onClick,
    onMouseEnter,
  }: {
    children: ReactNode;
    onClick?: (_: unknown, index: number) => void;
    onMouseEnter?: (_: unknown, index: number) => void;
  }) => (
    <div
      data-testid="team-workload-pie"
      onClick={() => onClick?.(null, 1)}
      onMouseEnter={() => onMouseEnter?.(null, 0)}
    >
      {children}
    </div>
  ),
  Cell: () => <div data-testid="team-workload-pie-cell" />,
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
    availability: "Away",
    capacityDataState: "insufficient_history",
  },
];

describe("TeamWorkloadDonut", () => {
  it("shows horizontal detail panel without visible table", () => {
    render(<TeamWorkloadDonut workload={workload} />);
    expect(screen.getByTestId("team-brief-workload-donut")).toBeTruthy();
    expect(screen.getByTestId("team-brief-workload-detail")).toBeTruthy();
    expect(screen.queryByTestId("team-brief-workload-table")).toBeNull();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Workload")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("selects largest segment by default and updates on click", () => {
    const { container } = render(<TeamWorkloadDonut workload={workload} />);
    const root = container.querySelector('[data-testid="team-brief-workload-donut"]')!;
    const detail = within(root as HTMLElement).getByTestId("team-brief-workload-detail");
    expect(detail).toHaveTextContent("Ada");
    expect(detail).toHaveTextContent("60% capacity");

    fireEvent.click(within(root as HTMLElement).getByTestId("team-workload-pie"));
    expect(detail).toHaveTextContent("Ben");
  });

  it("does not change center label on hover", () => {
    const { container } = render(<TeamWorkloadDonut workload={workload} />);
    const root = container.querySelector('[data-testid="team-brief-workload-donut"]')!;
    fireEvent.mouseEnter(within(root as HTMLElement).getByTestId("team-workload-pie"));
    expect(within(root as HTMLElement).getByText("Workload")).toBeTruthy();
    const detail = within(root as HTMLElement).getByTestId("team-brief-workload-detail");
    expect(detail).toHaveTextContent("Ada");
  });

  it("exposes keyboard-accessible member selectors", () => {
    const { container } = render(<TeamWorkloadDonut workload={workload} />);
    const root = container.querySelector('[data-testid="team-brief-workload-donut"]')!;
    const option = within(root as HTMLElement).getByRole("button", { name: /Ben:/i });
    fireEvent.click(option);
    expect(within(root as HTMLElement).getByTestId("team-brief-workload-detail")).toHaveTextContent(
      "Ben",
    );
  });
});
