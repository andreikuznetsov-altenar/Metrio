import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearBambooGoalsCache } from "../services/bamboo/bambooGoalsCache";

const listGoals = vi.fn();

vi.mock("../config/product", () => ({
  resolveBambooSubdomain: () => "acme",
}));

vi.mock("../services/bamboo/bambooClient", () => {
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
    },
  };
});

import { useBambooEmployeeGoals } from "./useBambooEmployeeGoals";
import { BambooPermissionError } from "../services/bamboo/bambooClient";

describe("useBambooEmployeeGoals", () => {
  beforeEach(() => {
    clearBambooGoalsCache();
    listGoals.mockReset();
  });

  it("fetches lazily per employee and reuses cache (no roster N+1)", async () => {
    listGoals.mockResolvedValue([
      {
        id: "1",
        employeeId: "10",
        title: "G",
        percentComplete: 0,
        status: "in_progress",
        sharedWithEmployeeIds: ["10"],
        milestones: [],
        hasMilestones: false,
      },
    ]);

    const first = renderHook(() =>
      useBambooEmployeeGoals("10", "status-inProgress", true),
    );
    await waitFor(() => expect(first.result.current.state).toBe("ready"));
    expect(listGoals).toHaveBeenCalledTimes(1);

    const second = renderHook(() =>
      useBambooEmployeeGoals("10", "status-inProgress", true),
    );
    await waitFor(() => expect(second.result.current.state).toBe("ready"));
    expect(listGoals).toHaveBeenCalledTimes(1);

    const other = renderHook(() =>
      useBambooEmployeeGoals("11", "status-inProgress", true),
    );
    await waitFor(() => expect(other.result.current.state).toBe("ready"));
    expect(listGoals).toHaveBeenCalledTimes(2);
  });

  it("does not fetch when disabled", async () => {
    const { result } = renderHook(() =>
      useBambooEmployeeGoals("10", "status-inProgress", false),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(listGoals).not.toHaveBeenCalled();
    expect(result.current.state).toBe("idle");
  });

  it("maps 403 to forbidden permission state", async () => {
    listGoals.mockRejectedValue(
      new BambooPermissionError("Goals aren't available with your BambooHR access."),
    );
    const { result } = renderHook(() =>
      useBambooEmployeeGoals("10", "status-inProgress", true),
    );
    await waitFor(() => expect(result.current.state).toBe("forbidden"));
    expect(result.current.errorMessage).toContain("BambooHR access");
  });
});
