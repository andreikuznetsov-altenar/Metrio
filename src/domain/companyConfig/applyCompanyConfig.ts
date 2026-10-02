import type { CompanyConfigCacheFile, CompanyConfigHistoryEntry } from "./companyConfigTypes";
import { validateCompanyConfig } from "./validateCompanyConfig";

const MAX_HISTORY = 20;

export function applyValidatedCompanyConfig(
  cache: CompanyConfigCacheFile,
  nextRaw: unknown,
  summary?: string,
): { cache: CompanyConfigCacheFile; applied: boolean; errors: string[] } {
  const validated = validateCompanyConfig(nextRaw);
  if (!validated.ok || !validated.config) {
    return { cache, applied: false, errors: validated.errors };
  }
  const entry: CompanyConfigHistoryEntry = {
    configVersion: validated.config.configVersion,
    updatedAt: validated.config.updatedAt,
    summary,
  };
  const history = [
    entry,
    ...cache.history.filter(
      (h) => h.configVersion !== validated.config!.configVersion,
    ),
  ].slice(0, MAX_HISTORY);

  return {
    applied: true,
    errors: [],
    cache: {
      ...cache,
      active: validated.config,
      history,
      lastRemoteError: null,
    },
  };
}

export function rollbackCompanyConfig(
  cache: CompanyConfigCacheFile,
  configVersion: string,
): CompanyConfigCacheFile | null {
  const match = cache.history.find((h) => h.configVersion === configVersion);
  if (!match) return null;
  return cache;
}
