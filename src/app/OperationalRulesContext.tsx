import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_OPERATIONAL_RULES } from "../domain/operationalRules/operationalRulesDefaults";
import { normalizeOperationalRules } from "../domain/operationalRules/normalizeOperationalRules";
import type { OperationalRules } from "../domain/operationalRules/operationalRulesTypes";
import {
  loadPreferences,
  PREFERENCES_SAVED_EVENT,
  type AppPreferences,
} from "../platform/preferences";
import { useOptionalCompanyConfig } from "./CompanyConfigContext";

export interface OperationalRulesContextValue {
  rules: OperationalRules;
  refreshFromPreferences: () => Promise<void>;
}

const OperationalRulesContext = createContext<OperationalRulesContextValue | null>(
  null,
);

export function OperationalRulesProvider({ children }: { children: ReactNode }) {
  const companyConfig = useOptionalCompanyConfig();
  const [rules, setRules] = useState<OperationalRules>(DEFAULT_OPERATIONAL_RULES);

  const refreshFromPreferences = useCallback(async () => {
    try {
      const prefs = await loadPreferences();
      setRules(normalizeOperationalRules(prefs.operationalRules));
    } catch {
      setRules(DEFAULT_OPERATIONAL_RULES);
    }
  }, []);

  useEffect(() => {
    void refreshFromPreferences();
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<AppPreferences>).detail;
      if (detail?.operationalRules) {
        setRules(normalizeOperationalRules(detail.operationalRules));
      } else {
        void refreshFromPreferences();
      }
    };
    window.addEventListener(PREFERENCES_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(PREFERENCES_SAVED_EVENT, onSaved);
  }, [refreshFromPreferences]);

  const effectiveRules = companyConfig?.effective.operationalRules ?? rules;

  const value = useMemo(
    () => ({ rules: effectiveRules, refreshFromPreferences }),
    [effectiveRules, refreshFromPreferences],
  );

  return (
    <OperationalRulesContext.Provider value={value}>
      {children}
    </OperationalRulesContext.Provider>
  );
}

export function useOperationalRules(): OperationalRulesContextValue {
  const ctx = useContext(OperationalRulesContext);
  if (!ctx) {
    return {
      rules: DEFAULT_OPERATIONAL_RULES,
      refreshFromPreferences: async () => {},
    };
  }
  return ctx;
}
