import { resolveMetrioApiBaseUrl } from "../../config/metrioCloud";
import { MetrioCloudError, parseApiError } from "./metrioCloudErrors";
import { readMetrioCloudSession } from "./metrioCloudSession";
import type { GoalsDataFile } from "../../domain/goals/goalTypes";
import type { CompanyConfig } from "../../domain/companyConfig/companyConfigTypes";

export function isMetrioCloudConfigured(): boolean {
  return Boolean(resolveMetrioApiBaseUrl() && readMetrioCloudSession());
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = resolveMetrioApiBaseUrl();
  const session = readMetrioCloudSession();
  if (!base || !session) {
    throw new MetrioCloudError("offline", "Metrio Cloud offline");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  try {
    return await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    throw new MetrioCloudError("unavailable", "Metrio Cloud unavailable");
  }
}

export async function fetchCloudGoals(): Promise<GoalsDataFile | null> {
  if (!isMetrioCloudConfigured()) return null;
  const res = await apiFetch("/api/v1/goals");
  if (!res.ok) {
    throw parseApiError(res.status, await res.json().catch(() => ({})));
  }
  return (await res.json()) as GoalsDataFile;
}

export async function saveCloudGoal(
  goal: GoalsDataFile["goals"][number] & { revision?: number },
  method: "POST" | "PUT",
): Promise<void> {
  const path =
    method === "POST" ? "/api/v1/goals" : `/api/v1/goals/${encodeURIComponent(goal.id)}`;
  const headers: Record<string, string> = {};
  if (method === "PUT" && goal.revision != null) {
    headers["If-Match"] = String(goal.revision);
  }
  const res = await apiFetch(path, {
    method,
    headers,
    body: JSON.stringify({
      ...goal,
      revision: goal.revision ?? 1,
    }),
  });
  if (!res.ok) {
    throw parseApiError(res.status, await res.json().catch(() => ({})));
  }
}

export async function fetchPublishedCompanyConfig(): Promise<CompanyConfig | null> {
  if (!isMetrioCloudConfigured()) return null;
  const res = await apiFetch("/api/v1/config/published");
  if (!res.ok) {
    throw parseApiError(res.status, await res.json().catch(() => ({})));
  }
  const json = (await res.json()) as { payload?: CompanyConfig };
  return json.payload ?? null;
}

export async function publishCompanyConfigToCloud(
  config: CompanyConfig,
): Promise<void> {
  const res = await apiFetch("/api/v1/config/publish", {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: config.schemaVersion,
      version: config.configVersion,
      payload: config,
    }),
  });
  if (!res.ok) {
    throw parseApiError(res.status, await res.json().catch(() => ({})));
  }
}

export async function fetchCloudAccessMe(): Promise<{
  hasOrganizationScope: boolean;
  isCompanyAdmin: boolean;
} | null> {
  if (!isMetrioCloudConfigured()) return null;
  const res = await apiFetch("/api/v1/access/me");
  if (!res.ok) return null;
  return (await res.json()) as {
    hasOrganizationScope: boolean;
    isCompanyAdmin: boolean;
  };
}
