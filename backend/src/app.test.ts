import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { MetrioStore, seedDevUsers } from "./db/store.ts";

function appWithMemoryDb() {
  const store = new MetrioStore(null);
  store.update((db) => {
    db.users = seedDevUsers();
  });
  return createApp({
    store,
    jwtSecret: "test-jwt",
    devAuthSecret: "dev-secret",
    allowDevAuth: true,
  });
}

async function devToken(
  app: ReturnType<typeof createApp>,
  bambooEmployeeId: string,
): Promise<string> {
  const res = await app.request("/api/v1/auth/dev-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Metrio-Dev-Secret": "dev-secret",
    },
    body: JSON.stringify({ bambooEmployeeId }),
  });
  const json = (await res.json()) as { token: string };
  return json.token;
}

describe("metrio api", () => {
  it("health", async () => {
    const app = appWithMemoryDb();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("manager can list direct report goals only after create", async () => {
    const app = appWithMemoryDb();
    const sam = await devToken(app, "person-sam");
    const alex = await devToken(app, "person-alex");

    const create = await app.request("/api/v1/goals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alex}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Ship feature",
        ownerPersonId: "person-alex",
        scope: "person",
        status: "active",
        progressMode: "manual",
      }),
    });
    expect(create.status).toBe(201);

    const listSam = await app.request("/api/v1/goals", {
      headers: { Authorization: `Bearer ${sam}` },
    });
    const samGoals = (await listSam.json()) as { goals: { title: string }[] };
    expect(samGoals.goals.some((g) => g.title === "Ship feature")).toBe(true);

    const stranger = await devToken(app, "person-01");
    const listOther = await app.request("/api/v1/goals", {
      headers: { Authorization: `Bearer ${stranger}` },
    });
    const otherGoals = (await listOther.json()) as { goals: unknown[] };
    expect(otherGoals.goals.length).toBe(0);
  });

  it("goal conflict on revision", async () => {
    const app = appWithMemoryDb();
    const alex = await devToken(app, "person-alex");
    const create = await app.request("/api/v1/goals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alex}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "g1",
        title: "A",
        ownerPersonId: "person-alex",
        scope: "person",
        status: "active",
        progressMode: "manual",
      }),
    });
    const goal = (await create.json()) as { id: string; revision: number };

    const ok = await app.request(`/api/v1/goals/${goal.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${alex}`,
        "Content-Type": "application/json",
        "If-Match": String(goal.revision),
      },
      body: JSON.stringify({ title: "B" }),
    });
    expect(ok.status).toBe(200);

    const conflict = await app.request(`/api/v1/goals/${goal.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${alex}`,
        "Content-Type": "application/json",
        "If-Match": String(goal.revision),
      },
      body: JSON.stringify({ title: "C" }),
    });
    expect(conflict.status).toBe(409);
  });

  it("non-admin cannot publish config", async () => {
    const app = appWithMemoryDb();
    const alex = await devToken(app, "person-alex");
    const res = await app.request("/api/v1/config/publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alex}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version: "1", payload: { company: { displayName: "X" } } }),
    });
    expect(res.status).toBe(403);
  });
});
