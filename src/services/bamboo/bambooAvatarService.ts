import { invoke } from "@tauri-apps/api/core";
import { parseInvokeError } from "../../platform/apiTypes";

const memoryCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

export interface BambooPhotoPayload {
  content_type: string;
  data_base64: string;
}

export async function fetchEmployeeAvatarDataUrl(
  employeeId: string,
  subdomain: string,
): Promise<string | null> {
  const key = `${subdomain}:${employeeId}`;
  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const payload = await invoke<BambooPhotoPayload>("bamboo_get_employee_photo", {
        config: { subdomain },
        employee_id: employeeId,
      });
      const src = `data:${payload.content_type};base64,${payload.data_base64}`;
      memoryCache.set(key, src);
      return src;
    } catch (error) {
      void parseInvokeError(error);
      memoryCache.set(key, null);
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
): string | null | undefined {
  const key = `${subdomain}:${employeeId}`;
  if (!memoryCache.has(key)) return undefined;
  return memoryCache.get(key) ?? null;
}

export function clearEmployeeAvatarCacheForTests(): void {
  memoryCache.clear();
  inflight.clear();
}
