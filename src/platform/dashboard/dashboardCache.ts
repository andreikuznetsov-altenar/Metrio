import { invoke } from "@tauri-apps/api/core";
import type { UserRole } from "../../domain/types";
import type { PerformanceFetchResult } from "../../services/performance/performanceTypes";

export const DASHBOARD_CACHE_SCHEMA_VERSION = 1;

const VISUAL_DASHBOARD_CACHE_KEY = "metrio-visual-dashboard-cache";

export interface DashboardCacheIdentity {
  selfPersonId: string;
  role: UserRole;
  datasetKey: string;
  workEmail?: string;
}

export interface DashboardCacheFile {
  schemaVersion: number;
  savedAt: string;
  sourceLastUpdatedAt: string;
  identity: DashboardCacheIdentity;
  fetchResult: PerformanceFetchResult;
}

export interface DashboardCacheLookup {
  datasetKey: string;
  selfPersonId: string;
  role: UserRole;
  workEmail?: string;
}

let memoryCache: DashboardCacheFile | null = null;

function isVisualFixtureBuild(): boolean {
  return import.meta.env.VITE_VISUAL_FIXTURE === "1";
}

function readVisualCache(): DashboardCacheFile | null {
  if (!isVisualFixtureBuild() || typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(VISUAL_DASHBOARD_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DashboardCacheFile;
  } catch {
    return null;
  }
}

function writeVisualCache(file: DashboardCacheFile): void {
  if (!isVisualFixtureBuild() || typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(VISUAL_DASHBOARD_CACHE_KEY, JSON.stringify(file));
}

export function validateDashboardCache(
  raw: Partial<DashboardCacheFile> | null | undefined,
  lookup: DashboardCacheLookup,
): DashboardCacheFile | null {
  if (!raw || typeof raw !== "object") return null;
  if (raw.schemaVersion !== DASHBOARD_CACHE_SCHEMA_VERSION) return null;
  if (!raw.fetchResult?.teamSnapshot) return null;
  const identity = raw.identity;
  if (!identity) return null;
  if (identity.selfPersonId !== lookup.selfPersonId) return null;
  if (identity.datasetKey !== lookup.datasetKey) return null;
  if (identity.role !== lookup.role) return null;
  if (
    lookup.workEmail &&
    identity.workEmail &&
    identity.workEmail.toLowerCase() !== lookup.workEmail.toLowerCase()
  ) {
    return null;
  }
  if (!raw.savedAt || !raw.sourceLastUpdatedAt) return null;
  return raw as DashboardCacheFile;
}

export async function loadDashboardCache(
  lookup: DashboardCacheLookup,
): Promise<DashboardCacheFile | null> {
  if (import.meta.env.MODE === "test") {
    return validateDashboardCache(memoryCache, lookup);
  }
  const visual = readVisualCache();
  if (visual) {
    return validateDashboardCache(visual, lookup);
  }
  try {
    const raw = await invoke<Partial<DashboardCacheFile>>("dashboard_cache_load");
    return validateDashboardCache(raw, lookup);
  } catch {
    return null;
  }
}

export async function saveDashboardCache(file: DashboardCacheFile): Promise<void> {
  const payload: DashboardCacheFile = {
    ...file,
    schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
  };
  if (import.meta.env.MODE === "test") {
    memoryCache = payload;
    return;
  }
  if (isVisualFixtureBuild()) {
    writeVisualCache(payload);
    return;
  }
  await invoke("dashboard_cache_save", { data: payload });
}

export function clearDashboardCacheForTests(): void {
  memoryCache = null;
}

export async function clearDashboardCache(): Promise<void> {
  memoryCache = null;
  if (import.meta.env.MODE === "test") return;
  if (isVisualFixtureBuild() && typeof localStorage !== "undefined") {
    localStorage.removeItem(VISUAL_DASHBOARD_CACHE_KEY);
    return;
  }
  try {
    await invoke("dashboard_cache_clear");
  } catch {
    // ignore outside desktop host
  }
}
