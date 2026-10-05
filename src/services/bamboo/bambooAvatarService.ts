import { invoke } from "@tauri-apps/api/core";
import { resolveBambooSubdomain } from "../../config/product";
import { clearPersonDirectory } from "../../domain/people/personDirectory";
import { loadPreferences } from "../../platform/preferences";
import {
  avatarCacheStatusFromPhotoError,
  classifyBambooPhotoInvokeError,
} from "./bambooPhotoInvokeError";

export type BambooEmployeePhotoSize = "small" | "medium";

export type AvatarCacheStatus = "ok" | "missing" | "forbidden" | "failed";

interface CacheEntry {
  dataUrl: string | null;
  status: AvatarCacheStatus;
  expiresAt?: number;
}

const MAX_CACHE_ENTRIES = 500;
const TRANSIENT_FAILURE_TTL_MS = 30_000;
/** Bump when invoke contract or failure semantics change (clears stale session cache). */
const AVATAR_CACHE_KEY_VERSION = "camelCase-v2";
const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

let cachedSubdomain: string | null | undefined;
let sessionEmployeePhotosForbidden = false;

export interface BambooPhotoPayload {
  content_type: string;
  data_base64: string;
}

function cacheKey(
  subdomain: string,
  employeeId: string,
  size: BambooEmployeePhotoSize,
): string {
  return `${AVATAR_CACHE_KEY_VERSION}:${subdomain}:${employeeId}:${size}`;
}

function getFreshEntry(key: string): CacheEntry | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt != null && entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry;
}

function setCacheEntry(key: string, entry: CacheEntry): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
  memoryCache.set(key, entry);
  while (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest === undefined) break;
    memoryCache.delete(oldest);
  }
}

export async function resolveAvatarSubdomain(): Promise<string | null> {
  if (cachedSubdomain !== undefined) return cachedSubdomain;
  const prefs = await loadPreferences();
  cachedSubdomain = resolveBambooSubdomain(prefs) || null;
  return cachedSubdomain;
}

export function resetAvatarSession(): void {
  cachedSubdomain = undefined;
  memoryCache.clear();
  inflight.clear();
  sessionEmployeePhotosForbidden = false;
  clearPersonDirectory();
}

export function isEmployeePhotoPermissionBlocked(): boolean {
  return sessionEmployeePhotosForbidden;
}

export function getEmployeePhotoPermissionHint(): string | null {
  return sessionEmployeePhotosForbidden
    ? "Employee photos unavailable with current BambooHR permissions."
    : null;
}

export function noteEmployeePhotoPermissionDenied(): void {
  sessionEmployeePhotosForbidden = true;
}

export function invalidateEmployeeAvatarCache(
  employeeId: string,
  subdomain: string,
  size: BambooEmployeePhotoSize = "small",
  reason: "broken-image" | "manual" = "manual",
): void {
  const key = cacheKey(subdomain, employeeId.trim(), size);
  memoryCache.delete(key);
  if (reason === "broken-image") {
    setCacheEntry(key, { dataUrl: null, status: "missing" });
  }
}

export async function fetchEmployeeAvatarDataUrl(
  employeeId: string,
  subdomain: string,
  size: BambooEmployeePhotoSize = "small",
): Promise<string | null> {
  const trimmedId = employeeId.trim();
  if (!trimmedId || !subdomain.trim()) return null;

  const key = cacheKey(subdomain, trimmedId, size);
  const cached = getFreshEntry(key);
  if (cached) {
    return cached.dataUrl;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    let visual: string | null | undefined;
    if (import.meta.env.VITE_VISUAL_FIXTURE === "1") {
      const mod = await import("../../fixtures/personAvatarVisualFixture");
      visual = mod.getVisualEmployeePhotoDataUrl(trimmedId);
    }
    if (visual !== undefined) {
      const entry: CacheEntry = {
        dataUrl: visual,
        status: visual ? "ok" : "missing",
      };
      setCacheEntry(key, entry);
      return visual;
    }

    try {
      const payload = await invoke<BambooPhotoPayload>("bamboo_get_employee_photo", {
        config: { subdomain },
        employeeId: trimmedId,
        photoSize: size,
      });
      if (
        !payload.data_base64?.trim() ||
        !payload.content_type?.startsWith("image/")
      ) {
        setCacheEntry(key, {
          dataUrl: null,
          status: "failed",
          expiresAt: Date.now() + TRANSIENT_FAILURE_TTL_MS,
        });
        return null;
      }
      const src = `data:${payload.content_type};base64,${payload.data_base64}`;
      setCacheEntry(key, { dataUrl: src, status: "ok" });
      return src;
    } catch (error) {
      const classified = classifyBambooPhotoInvokeError(error);
      const status = avatarCacheStatusFromPhotoError(classified);
      if (status === "forbidden") {
        sessionEmployeePhotosForbidden = true;
      }
      if (status === "failed") {
        setCacheEntry(key, {
          dataUrl: null,
          status,
          expiresAt: Date.now() + TRANSIENT_FAILURE_TTL_MS,
        });
        return null;
      }
      setCacheEntry(key, { dataUrl: null, status });
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function peekCachedEmployeeAvatar(
  employeeId: string,
  subdomain: string,
  size: BambooEmployeePhotoSize = "small",
): string | null | undefined {
  const key = cacheKey(subdomain, employeeId.trim(), size);
  const entry = getFreshEntry(key);
  if (!entry) return undefined;
  return entry.dataUrl;
}

export function peekAvatarCacheStatus(
  employeeId: string,
  subdomain: string,
  size: BambooEmployeePhotoSize = "small",
): AvatarCacheStatus | undefined {
  const key = cacheKey(subdomain, employeeId.trim(), size);
  return getFreshEntry(key)?.status;
}

export function clearEmployeeAvatarCacheForTests(): void {
  memoryCache.clear();
  inflight.clear();
  cachedSubdomain = undefined;
}
