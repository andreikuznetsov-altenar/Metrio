import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyValidatedCompanyConfig } from "../domain/companyConfig/applyCompanyConfig";
import { buildDefaultCompanyConfig } from "../domain/companyConfig/buildDefaultCompanyConfig";
import {
  buildEffectiveConfig,
  type EffectiveConfig,
  type IntegrationCapabilities,
} from "../domain/companyConfig/buildEffectiveConfig";
import { applyCompanyConfigForDevAdmin } from "../domain/companyConfig/companyAdmin";
import type { CompanyConfigCacheFile } from "../domain/companyConfig/companyConfigTypes";
import { configureNewStarterWindow } from "../domain/onboarding/newStarter";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  PREFERENCES_SAVED_EVENT,
  type AppPreferences,
} from "../platform/preferences";
import {
  loadCompanyConfigCache,
  saveCompanyConfigCache,
} from "../services/companyConfig/companyConfigPersistence";
import { fetchRemoteCompanyConfig } from "../services/companyConfig/fetchRemoteCompanyConfig";
import { useOptionalCurrentUser } from "./CurrentUserContext";

export const COMPANY_CONFIG_CHANGED = "metrio-company-config-changed";

interface CompanyConfigContextValue {
  cache: CompanyConfigCacheFile;
  effective: EffectiveConfig;
  loading: boolean;
  refresh: () => Promise<void>;
  publishConfig: (raw: unknown, summary?: string) => Promise<{ ok: boolean; errors: string[] }>;
  tryRemoteRefresh: () => Promise<void>;
}

const CompanyConfigContext = createContext<CompanyConfigContextValue | null>(null);

function buildCapabilities(prefs: AppPreferences): IntegrationCapabilities {
  return {
    jiraConfigured: Boolean(
      prefs.jiraBaseUrl?.trim() || prefs.credentials?.jiraConfigured,
    ),
    bambooConfigured: Boolean(
      prefs.bambooSubdomain?.trim() || prefs.credentials?.bambooConfigured,
    ),
    googleFeedbackConfigured: prefs.google.formsConnected && prefs.google.gmailConnected,
  };
}

function applyDevFixtureAdmin(cache: CompanyConfigCacheFile): CompanyConfigCacheFile {
  if (import.meta.env.VITE_VISUAL_FIXTURE !== "1") return cache;
  if (typeof localStorage === "undefined") return cache;
  const raw = localStorage.getItem("metrio-company-config-dev-admin-emails");
  if (!raw) return cache;
  try {
    const emails = JSON.parse(raw) as string[];
    return {
      ...cache,
      active: applyCompanyConfigForDevAdmin(cache.active, emails),
    };
  } catch {
    return cache;
  }
}

export function CompanyConfigProvider({ children }: { children: ReactNode }) {
  const currentUser = useOptionalCurrentUser();
  const [cache, setCache] = useState<CompanyConfigCacheFile | null>(null);
  const [prefs, setPrefs] = useState<AppPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [loadedCache, loadedPrefs] = await Promise.all([
      loadCompanyConfigCache(),
      loadPreferences(),
    ]);
    const withDev = applyDevFixtureAdmin(loadedCache);
    setCache(withDev);
    setPrefs(loadedPrefs);
    configureNewStarterWindow(withDev.active.onboarding.newStarterDays);
    setLoading(false);
    window.dispatchEvent(new CustomEvent(COMPANY_CONFIG_CHANGED));
  }, []);

  useEffect(() => {
    void reload();
    const onPrefs = () => void reload();
    window.addEventListener(PREFERENCES_SAVED_EVENT, onPrefs);
    return () => window.removeEventListener(PREFERENCES_SAVED_EVENT, onPrefs);
  }, [reload]);

  const effective = useMemo((): EffectiveConfig => {
    const company = cache?.active ?? buildDefaultCompanyConfig();
    const p = prefs ?? DEFAULT_PREFERENCES;
    const user = currentUser?.currentUser ?? {
      person: { id: "anonymous", name: "User", role: "employee" },
    };
    return buildEffectiveConfig({
      company,
      prefs: p,
      currentUser: user,
      capabilities: buildCapabilities(p),
    });
  }, [cache, prefs, currentUser]);

  const publishConfig = useCallback(
    async (raw: unknown, summary?: string) => {
      const base = cache ?? { active: buildDefaultCompanyConfig(), history: [], schemaVersion: 1 };
      const result = applyValidatedCompanyConfig(base, raw, summary);
      if (!result.applied) {
        return { ok: false, errors: result.errors };
      }
      await saveCompanyConfigCache(result.cache);
      setCache(result.cache);
      configureNewStarterWindow(result.cache.active.onboarding.newStarterDays);
      window.dispatchEvent(new CustomEvent(COMPANY_CONFIG_CHANGED));
      return { ok: true, errors: [] };
    },
    [cache],
  );

  const tryRemoteRefresh = useCallback(async () => {
    const remote = await fetchRemoteCompanyConfig();
    const base = cache ?? { active: buildDefaultCompanyConfig(), history: [], schemaVersion: 1 };
    if (!remote.ok || !remote.config) {
      await saveCompanyConfigCache({
        ...base,
        lastRemoteError: remote.error ?? "Unknown error",
        lastRemoteFetchAt: new Date().toISOString(),
      });
      return;
    }
    const result = applyValidatedCompanyConfig(base, remote.config, "Remote fetch");
    if (result.applied) {
      await saveCompanyConfigCache({
        ...result.cache,
        lastRemoteFetchAt: new Date().toISOString(),
        lastRemoteError: null,
      });
      setCache(result.cache);
      configureNewStarterWindow(result.cache.active.onboarding.newStarterDays);
    }
  }, [cache]);

  const value = useMemo(
    () => ({
      cache: cache ?? { active: buildDefaultCompanyConfig(), history: [], schemaVersion: 1 },
      effective,
      loading,
      refresh: reload,
      publishConfig,
      tryRemoteRefresh,
    }),
    [cache, effective, loading, reload, publishConfig, tryRemoteRefresh],
  );

  return (
    <CompanyConfigContext.Provider value={value}>
      {children}
    </CompanyConfigContext.Provider>
  );
}

export function useOptionalCompanyConfig(): CompanyConfigContextValue | null {
  return useContext(CompanyConfigContext);
}

export function useCompanyConfig(): CompanyConfigContextValue {
  const ctx = useContext(CompanyConfigContext);
  if (!ctx) {
    throw new Error("useCompanyConfig requires CompanyConfigProvider");
  }
  return ctx;
}

export function useEffectiveConfig(): EffectiveConfig {
  return useCompanyConfig().effective;
}
