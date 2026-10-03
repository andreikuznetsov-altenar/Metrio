import { resolveMetrioApiBaseUrl, resolveMetrioDevAuthSecret } from "../../config/metrioCloud";

const SESSION_KEY = "metrio-cloud-session";

export interface MetrioCloudSession {
  token: string;
  expiresAt: number;
  bambooEmployeeId: string;
}

export interface MetrioCloudStatus {
  state: "disconnected" | "connected" | "unavailable";
  lastError?: string;
}

let status: MetrioCloudStatus = { state: "disconnected" };

export function getMetrioCloudStatus(): MetrioCloudStatus {
  return status;
}

export function setMetrioCloudStatus(next: MetrioCloudStatus): void {
  status = next;
  window.dispatchEvent(new CustomEvent("metrio-cloud-status-changed"));
}

export function readMetrioCloudSession(): MetrioCloudSession | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MetrioCloudSession;
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeMetrioCloudSession(session: MetrioCloudSession | null): void {
  if (typeof localStorage === "undefined") return;
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    setMetrioCloudStatus({ state: "disconnected" });
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setMetrioCloudStatus({ state: "connected" });
}

export async function connectMetrioCloudDevSession(
  bambooEmployeeId: string,
): Promise<MetrioCloudSession> {
  const base = resolveMetrioApiBaseUrl();
  const devSecret = resolveMetrioDevAuthSecret();
  if (!base || !devSecret) {
    throw new Error("Metrio Cloud is not configured for this build.");
  }
  const res = await fetch(`${base}/api/v1/auth/dev-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Metrio-Dev-Secret": devSecret,
    },
    body: JSON.stringify({ bambooEmployeeId }),
  });
  if (!res.ok) {
    setMetrioCloudStatus({ state: "unavailable", lastError: `Auth failed (${res.status})` });
    throw new Error("Could not connect to Metrio Cloud.");
  }
  const json = (await res.json()) as { token: string; expiresIn: number };
  const session: MetrioCloudSession = {
    token: json.token,
    expiresAt: Date.now() + json.expiresIn * 1000,
    bambooEmployeeId,
  };
  writeMetrioCloudSession(session);
  return session;
}

export function disconnectMetrioCloud(): void {
  writeMetrioCloudSession(null);
}
