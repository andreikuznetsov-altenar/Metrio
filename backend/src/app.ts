import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AccessUser, MetrioStore } from "./db/store.ts";
import { ApiError, errorBody } from "./domain/errors.ts";
import { canEditGoal, canViewGoal } from "./domain/goalAccess.ts";
import { signSession, verifySession } from "./auth/jwt.ts";
import type { GoalRecord } from "./routes/goalsTypes.ts";
import { appendAudit } from "./audit.ts";

export interface AppEnv {
  store: MetrioStore;
  jwtSecret: string;
  allowDevAuth: boolean;
  devAuthSecret: string;
}

function getBearer(c: { req: { header: (n: string) => string | undefined } }): string | null {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

async function resolveActor(
  env: AppEnv,
  token: string | null,
): Promise<AccessUser> {
  if (!token) {
    throw new ApiError("unauthorized", "Missing session", 401);
  }
  let claims;
  try {
    claims = await verifySession(token, env.jwtSecret);
  } catch {
    throw new ApiError("unauthorized", "Invalid session", 401);
  }
  const user = env.store.snapshot().users.find(
    (u) => u.bambooEmployeeId === claims.sub,
  );
  if (!user) {
    throw new ApiError("forbidden", "User not provisioned", 403);
  }
  if (claims.email && user.email.toLowerCase() !== claims.email.toLowerCase()) {
    throw new ApiError("forbidden", "Email mismatch", 403);
  }
  return user;
}

export function createApp(env: AppEnv): Hono {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) =>
    c.json({ ok: true, service: "metrio-api", version: "0.1.0" }),
  );

  app.post("/api/v1/auth/dev-session", async (c) => {
    if (!env.allowDevAuth) {
      return c.json(errorBody("forbidden", "Dev auth disabled"), 403);
    }
    const secret = c.req.header("x-metrio-dev-secret");
    if (secret !== env.devAuthSecret) {
      return c.json(errorBody("unauthorized", "Invalid dev secret"), 401);
    }
    const body = await c.req.json<{ bambooEmployeeId: string }>();
    const id = body.bambooEmployeeId?.trim();
    if (!id) {
      return c.json(errorBody("validation", "bambooEmployeeId required"), 400);
    }
    const user = env.store.snapshot().users.find((u) => u.bambooEmployeeId === id);
    if (!user) {
      return c.json(errorBody("forbidden", "Unknown user"), 403);
    }
    const token = await signSession(
      { sub: user.bambooEmployeeId, email: user.email },
      env.jwtSecret,
    );
    return c.json({
      token,
      expiresIn: 3600,
      user: {
        bambooEmployeeId: user.bambooEmployeeId,
        role: user.role,
        directReportIds: user.directReportIds,
        isCompanyAdmin: user.isCompanyAdmin,
        hasOrganizationScope: user.hasOrganizationScope,
      },
    });
  });

  app.get("/api/v1/access/me", async (c) => {
    try {
      const actor = await resolveActor(env, getBearer(c));
      return c.json({
        bambooEmployeeId: actor.bambooEmployeeId,
        email: actor.email,
        role: actor.role,
        directReportIds: actor.directReportIds,
        isCompanyAdmin: actor.isCompanyAdmin,
        hasOrganizationScope: actor.hasOrganizationScope,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  app.get("/api/v1/goals", async (c) => {
    try {
      const actor = await resolveActor(env, getBearer(c));
      const goals = env.store
        .snapshot()
        .goals.filter((g) => canViewGoal(actor, g));
      return c.json({ schemaVersion: 1, goals, history: [] });
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  app.post("/api/v1/goals", async (c) => {
    try {
      const actor = await resolveActor(env, getBearer(c));
      const body = (await c.req.json()) as GoalRecord;
      if (!body.ownerPersonId || !body.title) {
        return c.json(errorBody("validation", "Invalid goal"), 400);
      }
      const draft: GoalRecord = {
        ...body,
        id: body.id || `goal-${Date.now()}`,
        revision: 1,
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        linkedJiraIssueKeys: body.linkedJiraIssueKeys ?? [],
        linkedJiraProjectKeys: body.linkedJiraProjectKeys ?? [],
        linkedConfluencePageIds: body.linkedConfluencePageIds ?? [],
        employeeMayEditManualProgress: body.employeeMayEditManualProgress ?? true,
      };
      if (!canEditGoal(actor, draft) && draft.ownerPersonId !== actor.bambooEmployeeId) {
        return c.json(errorBody("forbidden", "Cannot create goal for owner"), 403);
      }
      env.store.update((db) => {
        db.goals.push(draft);
        appendAudit(db, actor.bambooEmployeeId, "goal.create", draft.id);
      });
      return c.json(draft, 201);
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  app.put("/api/v1/goals/:id", async (c) => {
    try {
      const actor = await resolveActor(env, getBearer(c));
      const id = c.req.param("id");
      const ifMatch = c.req.header("if-match");
      const body = (await c.req.json()) as GoalRecord;
      const db = env.store.snapshot();
      const index = db.goals.findIndex((g) => g.id === id);
      if (index < 0) {
        return c.json(errorBody("not_found", "Goal not found"), 404);
      }
      const existing = db.goals[index];
      if (!canEditGoal(actor, existing)) {
        return c.json(errorBody("forbidden", "Cannot edit goal"), 403);
      }
      const expectedRev = ifMatch ? Number(ifMatch) : existing.revision;
      if (expectedRev !== existing.revision) {
        return c.json(errorBody("conflict", "Revision mismatch"), 409);
      }
      const next: GoalRecord = {
        ...existing,
        ...body,
        id: existing.id,
        revision: existing.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      env.store.update((d) => {
        d.goals[index] = next;
        appendAudit(d, actor.bambooEmployeeId, "goal.update", id);
      });
      return c.json(next);
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  app.get("/api/v1/config/published", async (c) => {
    try {
      await resolveActor(env, getBearer(c));
      const published = env.store
        .snapshot()
        .configVersions.find((v) => v.status === "published");
      if (!published) {
        return c.json({ config: null });
      }
      return c.json({
        id: published.id,
        version: published.version,
        schemaVersion: published.schemaVersion,
        publishedAt: published.publishedAt,
        payload: published.payload,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  app.post("/api/v1/config/publish", async (c) => {
    try {
      const actor = await resolveActor(env, getBearer(c));
      if (!actor.isCompanyAdmin) {
        return c.json(errorBody("forbidden", "Admin required"), 403);
      }
      const body = await c.req.json<{
        schemaVersion: number;
        version: string;
        payload: unknown;
      }>();
      if (!body.payload || !body.version) {
        return c.json(errorBody("validation", "Invalid config"), 400);
      }
      const row = {
        id: `cfg-${Date.now()}`,
        schemaVersion: body.schemaVersion ?? 1,
        version: body.version,
        status: "published" as const,
        payload: body.payload,
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        createdBy: actor.bambooEmployeeId,
      };
      env.store.update((db) => {
        for (const v of db.configVersions) {
          if (v.status === "published") v.status = "draft";
        }
        db.configVersions.unshift(row);
        appendAudit(db, actor.bambooEmployeeId, "config.publish", row.id);
      });
      return c.json(row, 201);
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  app.get("/api/v1/onboarding/instances/:employeeId", async (c) => {
    try {
      const actor = await resolveActor(env, getBearer(c));
      const employeeId = c.req.param("employeeId");
      if (
        employeeId !== actor.bambooEmployeeId &&
        !actor.directReportIds.includes(employeeId) &&
        !actor.isCompanyAdmin
      ) {
        return c.json(errorBody("forbidden", "Cannot view onboarding"), 403);
      }
      const row = env.store.snapshot().onboarding.find(
        (o) => o.employeeId === employeeId,
      );
      return c.json({ instance: row ?? null });
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  app.put("/api/v1/onboarding/instances/:employeeId", async (c) => {
    try {
      const actor = await resolveActor(env, getBearer(c));
      const employeeId = c.req.param("employeeId");
      if (employeeId !== actor.bambooEmployeeId) {
        return c.json(errorBody("forbidden", "Self only"), 403);
      }
      const ifMatch = c.req.header("if-match");
      const body = await c.req.json<{
        configVersion: string;
        startedAt: string;
        endsAt: string;
        manualCompletions: Record<string, { completedAt: string; undoneAt?: string }>;
      }>();
      const db = env.store.snapshot();
      const index = db.onboarding.findIndex((o) => o.employeeId === employeeId);
      const existing = index >= 0 ? db.onboarding[index] : null;
      const expectedRev = ifMatch ? Number(ifMatch) : existing?.revision ?? 0;
      if (existing && expectedRev !== existing.revision) {
        return c.json(errorBody("conflict", "Revision mismatch"), 409);
      }
      const next = {
        employeeId,
        configVersion: body.configVersion,
        startedAt: body.startedAt,
        endsAt: body.endsAt,
        manualCompletions: body.manualCompletions ?? {},
        revision: (existing?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      env.store.update((d) => {
        if (index >= 0) d.onboarding[index] = next;
        else d.onboarding.push(next);
        appendAudit(d, actor.bambooEmployeeId, "onboarding.update", employeeId);
      });
      return c.json(next);
    } catch (e) {
      if (e instanceof ApiError) {
        return c.json(errorBody(e.code, e.message), e.status);
      }
      throw e;
    }
  });

  return app;
}
