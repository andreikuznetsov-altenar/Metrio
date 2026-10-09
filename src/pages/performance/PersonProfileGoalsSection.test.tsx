import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonProfileGoalsSection } from "./PersonProfileGoalsSection";

const useBambooEmployeeGoals = vi.fn();

vi.mock("../../hooks/useBambooEmployeeGoals", () => ({
  useBambooEmployeeGoals: (...args: unknown[]) => useBambooEmployeeGoals(...args),
}));

describe("PersonProfileGoalsSection", () => {
  beforeEach(() => {
    useBambooEmployeeGoals.mockReset();
  });

  it("loads employee Bamboo goals read-only", () => {
    useBambooEmployeeGoals.mockReturnValue({
      goals: [
        {
          id: "1",
          employeeId: "99",
          title: "Improve delivery",
          percentComplete: 40,
          dueDate: "2026-12-01",
          status: "in_progress",
          sharedWithEmployeeIds: ["99"],
          milestones: [
            { id: "m1", title: "A", completed: true },
            { id: "m2", title: "B", completed: false },
            { id: "m3", title: "C", completed: false },
            { id: "m4", title: "D", completed: false },
          ],
          hasMilestones: true,
        },
      ],
      state: "ready",
      stale: false,
      errorMessage: null,
      refresh: vi.fn(),
      invalidate: vi.fn(),
    });
    render(
      <PersonProfileGoalsSection bambooEmployeeId="99" enabled />,
    );
    expect(useBambooEmployeeGoals).toHaveBeenCalledWith(
      "99",
      "status-inProgress",
      true,
    );
    expect(screen.getByText("Improve delivery")).toBeInTheDocument();
    expect(screen.getByText(/40% complete/)).toBeInTheDocument();
    expect(screen.getByText("1 of 4 milestones")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("shows permission state for 403", () => {
    useBambooEmployeeGoals.mockReturnValue({
      goals: [],
      state: "forbidden",
      stale: false,
      errorMessage: "Goals aren't available with your BambooHR access.",
      refresh: vi.fn(),
      invalidate: vi.fn(),
    });
    render(
      <PersonProfileGoalsSection bambooEmployeeId="99" enabled />,
    );
    expect(
      screen.getByText("Goals aren't available with your BambooHR access."),
    ).toBeInTheDocument();
  });

  it("shows empty Bamboo message", () => {
    useBambooEmployeeGoals.mockReturnValue({
      goals: [],
      state: "empty",
      stale: false,
      errorMessage: null,
      refresh: vi.fn(),
      invalidate: vi.fn(),
    });
    render(
      <PersonProfileGoalsSection bambooEmployeeId="99" enabled />,
    );
    expect(screen.getByText("No active goals in BambooHR")).toBeInTheDocument();
  });

  it("does not fetch when drawer disabled (lazy)", () => {
    useBambooEmployeeGoals.mockReturnValue({
      goals: [],
      state: "idle",
      stale: false,
      errorMessage: null,
      refresh: vi.fn(),
      invalidate: vi.fn(),
    });
    render(
      <PersonProfileGoalsSection bambooEmployeeId="99" enabled={false} />,
    );
    expect(useBambooEmployeeGoals).toHaveBeenCalledWith(
      "99",
      "status-inProgress",
      false,
    );
  });
});
