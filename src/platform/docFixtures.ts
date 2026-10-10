import { invoke } from "@tauri-apps/api/core";

export type DocFixtureRole = "ic" | "lead" | "manager" | "director";

export interface DocFixtureMode {
  enabled: boolean;
  role: DocFixtureRole;
}

const DEFAULT_MODE: DocFixtureMode = { enabled: false, role: "lead" };

let cachedMode: Promise<DocFixtureMode> | null = null;
let testOverride: DocFixtureMode | null = null;

function normalizeRole(value: unknown): DocFixtureRole {
  return value === "ic" ||
    value === "lead" ||
    value === "manager" ||
    value === "director"
    ? value
    : "lead";
}

function normalizeMode(value: unknown): DocFixtureMode {
  if (!value || typeof value !== "object") {
    return DEFAULT_MODE;
  }
  const raw = value as { enabled?: unknown; role?: unknown };
  return {
    enabled: raw.enabled === true,
    role: normalizeRole(raw.role),
  };
}

export async function getDocFixtureMode(): Promise<DocFixtureMode> {
  if (testOverride) {
    return testOverride;
  }
  if (!cachedMode) {
    cachedMode = invoke("app_get_doc_fixture_mode")
      .then(normalizeMode)
      .catch(() => DEFAULT_MODE);
  }
  return cachedMode;
}

export function resetDocFixtureModeCacheForTests(): void {
  cachedMode = null;
  testOverride = null;
}

export function setDocFixtureModeForTests(mode: DocFixtureMode | null): void {
  testOverride = mode;
  cachedMode = null;
}
