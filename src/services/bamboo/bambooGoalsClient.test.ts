import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

import { BambooClient, BambooPermissionError } from "./bambooClient";

describe("BambooClient goals", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("lists goals via bamboo_list_goals", async () => {
    invoke.mockResolvedValueOnce({
      goals: [
        {
          id: "7",
          title: "Focus",
          percentComplete: 10,
          status: "in_progress",
          sharedWithEmployeeIds: [1],
          dueDate: "2026-12-01",
        },
      ],
    });
    const client = new BambooClient({ subdomain: "acme" });
    const goals = await client.listGoals("1", "status-inProgress");
    expect(invoke).toHaveBeenCalledWith("bamboo_list_goals", {
      config: { subdomain: "acme" },
      params: { employee_id: "1", filter: "status-inProgress" },
    });
    expect(goals).toHaveLength(1);
    expect(goals[0].title).toBe("Focus");
  });

  it("maps 403 to BambooPermissionError (not missing goal)", async () => {
    invoke.mockRejectedValueOnce(
      JSON.stringify({
        code: "bamboo_api_error",
        message: "Forbidden",
        status: 403,
      }),
    );
    const client = new BambooClient({ subdomain: "acme" });
    await expect(client.listGoals("1")).rejects.toBeInstanceOf(BambooPermissionError);
  });

  it("create uses payload builder with owner share", async () => {
    invoke.mockResolvedValueOnce({
      goal: {
        id: "9",
        title: "QA",
        percentComplete: 0,
        status: "in_progress",
        sharedWithEmployeeIds: [42],
        dueDate: "2026-12-01",
      },
    });
    const client = new BambooClient({ subdomain: "acme" });
    await client.createGoal("42", {
      title: "QA",
      dueDate: "2026-12-01",
      sharedWithEmployeeIds: [],
    });
    const call = invoke.mock.calls[0];
    expect(call[0]).toBe("bamboo_create_goal");
    const body = call[1].params.body as Record<string, unknown>;
    expect(body.sharedWithEmployeeIds).toEqual([42]);
    expect(body.percentComplete).toBe(0);
  });

  it("updateGoal omits milestones for normal edit", async () => {
    invoke.mockResolvedValueOnce({});
    const client = new BambooClient({ subdomain: "acme" });
    await client.updateGoal("42", "9", {
      title: "Renamed",
      dueDate: "2026-12-01",
      sharedWithEmployeeIds: ["42"],
    });
    const body = invoke.mock.calls[0][1].params.body as Record<string, unknown>;
    expect(body.milestones).toBeUndefined();
  });

  it("routes simple vs milestone progress endpoints", async () => {
    invoke.mockResolvedValue({});
    const client = new BambooClient({ subdomain: "acme" });
    await client.updateGoalProgress("42", "9", 40);
    expect(invoke.mock.calls[0][0]).toBe("bamboo_update_goal_progress");
    await client.updateMilestoneProgress("42", "9", "m1", { completed: true });
    expect(invoke.mock.calls[1][0]).toBe("bamboo_update_goal_milestone_progress");
  });

  it("Metrio role alone cannot grant Bamboo write — client trusts API 403", async () => {
    invoke.mockRejectedValueOnce(
      JSON.stringify({
        code: "bamboo_api_error",
        message: "Forbidden",
        status: 403,
      }),
    );
    const client = new BambooClient({ subdomain: "acme" });
    await expect(
      client.createGoal("42", {
        title: "Nope",
        dueDate: "2026-12-01",
        sharedWithEmployeeIds: ["42"],
      }),
    ).rejects.toBeInstanceOf(BambooPermissionError);
  });
});
