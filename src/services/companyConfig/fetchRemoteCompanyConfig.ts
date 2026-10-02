import { validateCompanyConfig } from "../../domain/companyConfig/validateCompanyConfig";

export interface RemoteConfigFetchResult {
  ok: boolean;
  config?: unknown;
  error?: string;
}

export function resolveRemoteCompanyConfigUrl(): string | null {
  const url = import.meta.env.VITE_COMPANY_CONFIG_URL;
  return typeof url === "string" && url.trim().startsWith("https://")
    ? url.trim()
    : null;
}

/**
 * Fetches remote company config over HTTPS. Integrity signature verification
 * must be added when a trusted signing key is available from the server.
 */
export async function fetchRemoteCompanyConfig(): Promise<RemoteConfigFetchResult> {
  const url = resolveRemoteCompanyConfigUrl();
  if (!url) {
    return { ok: false, error: "No remote config URL configured" };
  }
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const json = (await response.json()) as unknown;
    const validated = validateCompanyConfig(json);
    if (!validated.ok) {
      return { ok: false, error: validated.errors.join("; ") };
    }
    return { ok: true, config: validated.config };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Fetch failed",
    };
  }
}
