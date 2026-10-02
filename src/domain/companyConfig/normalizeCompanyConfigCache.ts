import { buildDefaultCompanyConfig } from "./buildDefaultCompanyConfig";
import {
  COMPANY_CONFIG_SCHEMA_VERSION,
  type CompanyConfigCacheFile,
} from "./companyConfigTypes";
import { validateCompanyConfig } from "./validateCompanyConfig";

export const EMPTY_COMPANY_CONFIG_CACHE: CompanyConfigCacheFile = {
  schemaVersion: COMPANY_CONFIG_SCHEMA_VERSION,
  active: buildDefaultCompanyConfig(),
  history: [],
};

export function normalizeCompanyConfigCache(
  raw: Partial<CompanyConfigCacheFile> | null | undefined,
): CompanyConfigCacheFile {
  if (!raw?.active) {
    return EMPTY_COMPANY_CONFIG_CACHE;
  }
  const validated = validateCompanyConfig(raw.active);
  if (!validated.ok || !validated.config) {
    return EMPTY_COMPANY_CONFIG_CACHE;
  }
  return {
    schemaVersion: raw.schemaVersion ?? COMPANY_CONFIG_SCHEMA_VERSION,
    active: validated.config,
    history: raw.history ?? [],
    lastRemoteFetchAt: raw.lastRemoteFetchAt ?? null,
    lastRemoteError: raw.lastRemoteError ?? null,
  };
}
