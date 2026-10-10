// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/Toast/ToastContext";
import { clearBambooGoalsCache } from "../../services/bamboo/bambooGoalsCache";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { buildBambooGoalUrl } from "../../config/buildBambooGoalUrl";

const listGoals = vi.fn();
const deleteGoal = vi.fn();
const getGoalAggregate = vi.fn();
const openExternalUrl = vi.fn(async () => undefined);
const loadGoalsData = vi.fn();
const removeBambooGoalSidecar = vi.fn(async () => undefined);

vi.mock("../../platform/openExternal", () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
}));

vi.mock("../../config/product", async () => {
  const actual = await vi.importActual<typeof import("../../config/product")>(
    "../../config/product",
  );
  return {
    ...actual,
    resolveBambooSubdomain: () => "altenar",
    getBuildBambooPortalUrl: () => "https://altenar.bamboohr.com",
  };
});

vi.mock("../../services/bamboo/bambooClient", () => {
  class BambooPermissionError extends Error {
    status = 403;
    constructor(message?: string) {
      super(message || "Goals aren't available with your BambooHR access.");
      this.name = "BambooPermissionError";
    }
  }
  return {
    BambooPermissionError,
    BambooClient: class {
      listGoals = listGoals;
      deleteGoal = deleteGoal;
      getGoalAggregate = getGoalAggregate;
      updateGoal = vi.fn();
      updateGoalProgress = vi.fn();
      updateMilestoneProgress = vi.fn();
      canCreateGoals = vi.fn(async () => true);
      getGoalShareOptions = vi.fn(async () => []);
      getGoalAlignmentOptions = vi.fn(async () => []);
    },
  };
});

vi.mock("../../services/goals/goalsPersistence", () => ({
  loadGoalsData: (...args: unknown[]) => loadGoalsData(...args),
  saveGoalsData: vi.fn(),
}));

vi.mock("../../services/goals/bambooGoalSidecar", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/goals/bambooGoalSidecar")
  >("../../services/goals/bambooGoalSidecar");
  return {
    ...actual,
    removeBambooGoalSidecar: (...args: unknown[]) =>
      removeBambooGoalSidecar(...args),
  };
});

vi.mock("../../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: { person: { id: "self-person" } },
  }),
}));

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    data: {
      teamSnapshot: {
        persons: [
          {
            id: "self-person",
            bamboo: { id: "42" },
          },
          {
            id: "report-person",
            bamboo: { id: "99" },
          },
        ],
      },
    },
  }),
}));

import { EmployeeGoalsView } from "./EmployeeGoalsView";
import { PersonProfileGoalsSection } from "./PersonProfileGoalsSection";
import { resetAppNavigationStateForTests } from "../../app/navigationStore";

const sampleGoal = (overrides: Partial<BambooGoal> = {}): BambooGoal => ({
  id: "g-1",
  employeeId: "42",
  title: "Bamboo QA Goal",
  description: "Ship Bamboo Goals UI",
  dueDate: "2026-12-31",
  percentComplete: 40,
  completionDate: null,
  status: "in_progress",
  sharedWithEmployeeIds: ["42"],
  alignsWithOptionId: "align-1",
  milestones: [],
  hasMilestones: false,
  ...overrides,
});

function renderOwnGoals() {
  return render(
    <ToastProvider>
      <EmployeeGoalsView personId="self-person" />
    </ToastProvider>,
  );
}

describe("PASS 15.5E Bamboo Goals canonical", () => {
  beforeEach(() => {
    clearBambooGoalsCache();
    listGoals.mockReset();
    deleteGoal.mockReset();
    getGoalAggregate.mockReset();
    openExternalUrl.mockReset();
    loadGoalsData.mockReset();
    removeBambooGoalSidecar.mockReset();
    listGoals.mockResolvedValue([sampleGoal()]);
    getGoalAggregate.mockResolvedValue(sampleGoal());
    loadGoalsData.mockResolvedValue({
      schemaVersion: 1,
      goals: [
        {
          id: "legacy-1",
          title: "фыфыфы",
          ownerPersonId: "self-person",
          scope: "team",
          status: "active",
          progressMode: "manual",
          linkedJiraIssueKeys: [],
          linkedJiraProjectKeys: [],
          linkedConfluencePageIds: [],
          employeeMayEditManualProgress: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          manualProgress: { kind: "steps", step: "in_progress" },
        },
      ],
      history: [
        {
          id: "h1",
          goalId: "legacy-1",
          at: "2026-01-01T00:00:00.000Z",
          actorPersonId: "self-person",
          change: { manualProgress: { kind: "steps", step: "in_progress" } },
        },
      ],
      bambooSidecars: [
        {
          bambooEmployeeId: "42",
          bambooGoalId: "g-1",
          linkedJiraIssueKeys: ["ABC-1"],
          linkedJiraProjectKeys: [],
          linkedConfluencePageIds: ["page-9"],
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      ],
    });
    deleteGoal.mockResolvedValue(undefined);
    removeBambooGoalSidecar.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    resetAppNavigationStateForTests();
  });

  it("A/B: Performance Goals uses Bamboo source; legacy local goals do not override", async () => {
    renderOwnGoals();
    await waitFor(() =>
      expect(screen.getByTestId("bamboo-goals-grid")).toBeInTheDocument(),
    );
    expect(screen.getByText("Bamboo QA Goal")).toBeInTheDocument();
    expect(screen.queryByText("фыфыфы")).not.toBeInTheDocument();
    expect(screen.queryByTestId("manager-goals")).not.toBeInTheDocument();
    expect(listGoals).toHaveBeenCalled();
  });

  it("C: Active / Completed / Closed filters map to Bamboo status filters", async () => {
    const user = userEvent.setup();
    renderOwnGoals();
    await waitFor(() => expect(listGoals).toHaveBeenCalled());
    expect(listGoals).toHaveBeenLastCalledWith("42", "status-inProgress");

    listGoals.mockResolvedValueOnce([
      sampleGoal({ id: "g-done", title: "Done", status: "completed" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Completed" }));
    await waitFor(() =>
      expect(listGoals).toHaveBeenLastCalledWith("42", "status-completed"),
    );

    listGoals.mockResolvedValueOnce([
      sampleGoal({ id: "g-closed", title: "Closed one", status: "closed" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Closed" }));
    await waitFor(() =>
      expect(listGoals).toHaveBeenLastCalledWith("42", "status-closed"),
    );
  });

  it("D/L: detail shows Bamboo field parity and humanized sidecar (no raw JSON history)", async () => {
    const user = userEvent.setup();
    renderOwnGoals();
    await waitFor(() => screen.getByText("Bamboo QA Goal"));
    await user.click(screen.getByTestId("bamboo-goal-open"));
    await waitFor(() =>
      expect(screen.getByTestId("bamboo-goal-detail")).toBeInTheDocument(),
    );
    const detail = screen.getByTestId("bamboo-goal-detail");
    expect(within(detail).getByTestId("bamboo-goal-description-view")).toHaveTextContent(
      "Ship Bamboo Goals UI",
    );
    expect(within(detail).getByText("In progress")).toBeInTheDocument();
    expect(within(detail).getByTestId("bamboo-goal-summary")).toHaveTextContent("40%");
    expect(within(detail).getByTestId("bamboo-goal-summary")).toHaveTextContent(
      "2026-12-31",
    );
    expect(within(detail).getByTestId("bamboo-goal-owner")).toHaveTextContent("42");
    expect(within(detail).getByTestId("bamboo-edit-title")).toHaveValue("Bamboo QA Goal");
    expect(within(detail).getByTestId("bamboo-edit-title").className).toContain(
      "metrio-field",
    );
    expect(within(detail).getByTestId("bamboo-edit-title").className).toContain(
      "input",
    );
    expect(within(detail).getByTestId("bamboo-edit-description")).toHaveValue(
      "Ship Bamboo Goals UI",
    );
    expect(
      within(detail).getByTestId("bamboo-edit-description").className,
    ).toContain("textarea");
    expect(
      within(detail).getByTestId("bamboo-edit-description").className,
    ).toContain("metrio-field");
    const editDueDate = within(detail).getByTestId("bamboo-edit-due-date");
    expect(editDueDate.className).toContain("metrio-date-picker__trigger");
    expect(editDueDate).toHaveTextContent(/Dec.*31|31.*Dec/i);
    expect(detail.querySelector('input[type="date"]')).toBeNull();
    expect(within(detail).getByTestId("bamboo-edit-share")).toBeInTheDocument();
    expect(within(detail).getByTestId("bamboo-edit-share").className).toContain(
      "metrio-field",
    );
    expect(within(detail).getByTestId("bamboo-edit-alignment")).toHaveValue("align-1");
    expect(
      within(detail).getByTestId("bamboo-edit-alignment").className,
    ).toContain("metrio-field");
    expect(within(detail).getByTestId("bamboo-edit-percent")).toHaveValue("40");

    const sidecar = within(detail).getByTestId("bamboo-sidecar-links");
    expect(sidecar).toHaveTextContent("Linked Jira work");
    expect(sidecar).toHaveTextContent("ABC-1");
    expect(sidecar).toHaveTextContent("Linked Confluence");
    expect(sidecar).toHaveTextContent("page-9");
    expect(detail.textContent).not.toMatch(/manualProgress/);
    expect(detail.textContent).not.toMatch(/\{"kind":"steps"/);
  });

  it("PASS 16.5: Edit in Metrio uses canonical date picker interaction, not native date input", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <EmployeeGoalsView personId="self-person" />
      </ToastProvider>,
    );
    await waitFor(() => screen.getByText("Bamboo QA Goal"));
    await user.click(screen.getByTestId("bamboo-goal-open"));
    const drawer = await screen.findByTestId("bamboo-goal-detail-drawer");
    expect(drawer.querySelector('input[type="date"]')).toBeNull();

    const detail = screen.getByTestId("bamboo-goal-detail");
    const dueDate = within(detail).getByTestId("bamboo-edit-due-date");
    expect(dueDate.className).toContain("metrio-date-picker__trigger");
    expect(dueDate.closest(".metrio-date-picker--stacked")).toBeTruthy();

    await user.click(dueDate);
    await waitFor(() => {
      expect(dueDate.getAttribute("data-state")).toBe("open");
    });
    expect(screen.getByRole("grid")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /December 15/i }));
    await waitFor(() => {
      expect(dueDate).toHaveTextContent(/Dec.*15|15.*Dec/i);
    });

    await user.click(dueDate);
    await waitFor(() => {
      expect(dueDate.getAttribute("data-state")).toBe("open");
    });
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(dueDate.getAttribute("data-state")).toBe("closed");
    });
    expect(screen.getByTestId("bamboo-goal-detail-drawer")).toBeInTheDocument();
  });

  it("E/F/G: delete confirms, calls Bamboo API, updates cache/UI, cleans sidecar", async () => {
    const user = userEvent.setup();
    listGoals
      .mockResolvedValueOnce([sampleGoal()])
      .mockResolvedValueOnce([]);
    renderOwnGoals();
    await waitFor(() => screen.getByTestId("bamboo-goal-delete"));
    await user.click(screen.getByTestId("bamboo-goal-delete"));
    expect(screen.getByTestId("bamboo-delete-confirm-copy")).toHaveTextContent(
      "This goal will be deleted from BambooHR.",
    );
    await user.click(screen.getByTestId("bamboo-delete-confirm"));
    await waitFor(() => expect(deleteGoal).toHaveBeenCalledWith("42", "g-1"));
    await waitFor(() =>
      expect(removeBambooGoalSidecar).toHaveBeenCalledWith("42", "g-1"),
    );
    await waitFor(() =>
      expect(screen.queryByText("Bamboo QA Goal")).not.toBeInTheDocument(),
    );
  });

  it("H/J: Open in Bamboo uses verified URL builder for own goal", async () => {
    const user = userEvent.setup();
    renderOwnGoals();
    await waitFor(() => screen.getByTestId("bamboo-goal-open-in-bamboo"));
    await user.click(screen.getByTestId("bamboo-goal-open-in-bamboo"));
    expect(openExternalUrl).toHaveBeenCalledWith(
      buildBambooGoalUrl({
        employeeId: "42",
        goalId: "g-1",
        portalBaseUrl: "https://altenar.bamboohr.com",
      }),
    );
    expect(openExternalUrl.mock.calls[0][0]).toBe(
      "https://altenar.bamboohr.com/performance/42/goals",
    );
  });

  it("I: person profile goal has Open in Bamboo (read-only, no Delete)", async () => {
    const user = userEvent.setup();
    listGoals.mockResolvedValue([
      sampleGoal({ id: "report-goal", employeeId: "99", title: "Report goal" }),
    ]);
    render(
      <ToastProvider>
        <PersonProfileGoalsSection bambooEmployeeId="99" enabled />
      </ToastProvider>,
    );
    await waitFor(() => screen.getByText("Report goal"));
    expect(
      screen.getByTestId("person-profile-goal-open-in-bamboo"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("bamboo-goal-delete")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("person-profile-goal-open-in-bamboo"));
    expect(openExternalUrl).toHaveBeenCalledWith(
      "https://altenar.bamboohr.com/performance/99/goals",
    );
  });

  it("K: Metrio sidecar links remain available after Bamboo content", async () => {
    const user = userEvent.setup();
    renderOwnGoals();
    await waitFor(() => screen.getByText("Bamboo QA Goal"));
    await user.click(screen.getByTestId("bamboo-goal-open"));
    await waitFor(() => screen.getByTestId("bamboo-sidecar-links"));
    expect(screen.getByTestId("bamboo-sidecar-links")).toHaveTextContent("ABC-1");
  });
});

describe("J verified URL builder", () => {
  it("centralizes the Altenar-verified Bamboo Goals SPA route", () => {
    expect(
      buildBambooGoalUrl({
        employeeId: "1",
        goalId: "999",
        portalBaseUrl: "https://altenar.bamboohr.com",
      }),
    ).toBe("https://altenar.bamboohr.com/performance/1/goals");
  });
});
