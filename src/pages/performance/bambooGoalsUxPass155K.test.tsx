// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/Toast/ToastContext";
import { clearBambooGoalsCache } from "../../services/bamboo/bambooGoalsCache";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { EmployeeGoalsView } from "./EmployeeGoalsView";

const listGoals = vi.fn();
const createGoal = vi.fn();

vi.mock("../../config/product", async () => {
  const actual = await vi.importActual<typeof import("../../config/product")>(
    "../../config/product",
  );
  return {
    ...actual,
    resolveBambooSubdomain: () => "altenar",
  };
});

vi.mock("../../services/bamboo/bambooClient", () => {
  class BambooPermissionError extends Error {
    status = 403;
  }
  return {
    BambooPermissionError,
    BambooClient: class {
      listGoals = listGoals;
      createGoal = createGoal;
      deleteGoal = vi.fn();
      getGoalAggregate = vi.fn();
      canCreateGoals = vi.fn(async () => true);
    },
  };
});

vi.mock("../../services/goals/goalsPersistence", () => ({
  loadGoalsData: vi.fn(async () => ({
    schemaVersion: 1,
    goals: [],
    history: [],
    bambooSidecars: [],
  })),
  saveGoalsData: vi.fn(),
}));

vi.mock("../../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: { person: { id: "self-person" } },
  }),
}));

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    data: {
      teamSnapshot: {
        persons: [{ id: "self-person", bamboo: { id: "42" } }],
      },
    },
  }),
}));

const sampleGoal = (): BambooGoal => ({
  id: "g-1",
  employeeId: "42",
  title: "Grow skills",
  dueDate: "2026-12-31",
  setDate: "2026-10-01",
  startDateIsExplicit: false,
  percentComplete: 62,
  status: "in_progress",
  sharedWithEmployeeIds: ["42"],
  milestones: [],
  hasMilestones: false,
});

function renderGoals() {
  return render(
    <ToastProvider>
      <EmployeeGoalsView personId="self-person" />
    </ToastProvider>,
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("PASS 15.5K Goals UX", () => {
  beforeEach(() => {
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
    clearBambooGoalsCache();
    listGoals.mockReset();
    createGoal.mockReset();
    listGoals.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("empty Active uses canonical EmptyState with icon", async () => {
    renderGoals();
    await waitFor(() =>
      expect(screen.getByTestId("bamboo-goals-empty-active")).toBeInTheDocument(),
    );
    expect(screen.getByText("No active goals")).toBeInTheDocument();
    expect(screen.queryByText(/No active goals in BambooHR/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("bamboo-goals-empty-active").querySelector(
      ".metrio-empty-state__icon",
    )).toBeTruthy();
  });

  it("Create goal opens drawer without listing goals inside", async () => {
    listGoals.mockResolvedValue([sampleGoal()]);
    const user = userEvent.setup();
    renderGoals();
    await waitFor(() => screen.getByTestId("bamboo-goals-grid"));
    await user.click(screen.getByTestId("bamboo-create-goal-open"));
    const drawer = await screen.findByTestId("bamboo-create-goal-drawer");
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).queryByTestId("bamboo-goals-grid")).toBeNull();
    expect(screen.getByTestId("bamboo-goals-grid")).toBeInTheDocument();
  });

  it("create form layout: no alignment, shared copy, or progress radios", async () => {
    const user = userEvent.setup();
    renderGoals();
    await waitFor(() => screen.getByTestId("bamboo-goals-empty-active"));
    await user.click(screen.getByTestId("bamboo-create-goal-open"));
    const form = await screen.findByTestId("bamboo-create-goal-form");
    expect(within(form).getByTestId("bamboo-goal-title")).toBeInTheDocument();
    expect(within(form).getByTestId("bamboo-goal-due-date")).toBeInTheDocument();
    expect(within(form).queryByText(/Shared with Owner/i)).toBeNull();
    expect(within(form).queryByText(/Alignment/i)).toBeNull();
    expect(within(form).queryByText(/Progress type/i)).toBeNull();
    expect(within(form).queryByRole("radio")).toBeNull();
    expect(within(form).getByTestId("bamboo-goal-milestones-switch")).toBeInTheDocument();
  });

  it("milestones switch reveals three inputs and add milestone", async () => {
    const user = userEvent.setup();
    renderGoals();
    await waitFor(() => screen.getByTestId("bamboo-goals-empty-active"));
    await user.click(screen.getByTestId("bamboo-create-goal-open"));
    const form = await screen.findByTestId("bamboo-create-goal-form");
    expect(within(form).queryByTestId("bamboo-goal-milestones")).toBeNull();
    await user.click(within(form).getByTestId("bamboo-goal-milestones-switch"));
    const milestones = within(form).getByTestId("bamboo-goal-milestones");
    expect(milestones.querySelectorAll("input")).toHaveLength(3);
    await user.click(within(form).getByTestId("bamboo-goal-add-milestone"));
    expect(milestones.querySelectorAll("input")).toHaveLength(4);
  });

  it("goal card shows large percent and set date from Bamboo field", async () => {
    listGoals.mockResolvedValue([sampleGoal()]);
    renderGoals();
    await waitFor(() => screen.getByTestId("bamboo-goal-card-percent"));
    expect(screen.getByTestId("bamboo-goal-card-percent")).toHaveTextContent("62%");
    expect(screen.getByTestId("bamboo-goal-card-dates")).toHaveTextContent("Set");
    expect(screen.getByTestId("bamboo-goal-card-dates")).toHaveTextContent("Due");
  });

  it("Cancel closes create drawer", async () => {
    const user = userEvent.setup();
    renderGoals();
    await waitFor(() => screen.getByTestId("bamboo-goals-empty-active"));
    await user.click(screen.getByTestId("bamboo-create-goal-open"));
    await user.click(screen.getByTestId("bamboo-create-goal-cancel"));
    await waitFor(() =>
      expect(screen.queryByTestId("bamboo-create-goal-drawer")).not.toBeInTheDocument(),
    );
  });
});
