import { invoke } from "@tauri-apps/api/core";
import {
  EMPTY_COMPANY_CONFIG_CACHE,
  normalizeCompanyConfigCache,
} from "../../domain/companyConfig/normalizeCompanyConfigCache";
import type { CompanyConfigCacheFile } from "../../domain/companyConfig/companyConfigTypes";

const VISUAL_COMPANY_CONFIG_KEY = "metrio-visual-company-config";

function isVisualFixtureBuild(): boolean {
  return import.meta.env.VITE_VISUAL_FIXTURE === "1";
}

export async function loadCompanyConfigCache(): Promise<CompanyConfigCacheFile> {
  if (isVisualFixtureBuild() && typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(VISUAL_COMPANY_CONFIG_KEY);
    if (raw) {
      return normalizeCompanyConfigCache(JSON.parse(raw) as Partial<CompanyConfigCacheFile>);
    }
  }
  try {
    const raw = await invoke<Partial<CompanyConfigCacheFile>>("company_config_cache_load");
    return normalizeCompanyConfigCache(raw);
  } catch {
    return EMPTY_COMPANY_CONFIG_CACHE;
  }
}

export async function saveCompanyConfigCache(
  cache: CompanyConfigCacheFile,
): Promise<void> {
  const payload = normalizeCompanyConfigCache(cache);
  if (isVisualFixtureBuild() && typeof localStorage !== "undefined") {
    localStorage.setItem(VISUAL_COMPANY_CONFIG_KEY, JSON.stringify(payload));
    return;
  }
  await invoke("company_config_cache_save", { data: payload });
}
