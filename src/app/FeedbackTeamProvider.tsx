import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCurrentUser } from "./CurrentUserContext";
import {
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from "../platform/preferences";
import { setFeedbackPrefsSnapshot } from "./feedbackPrefsBridge";
import { fetchPerformanceData } from "../services/performance/performanceDataService";
import type { TeamSnapshot } from "../domain/people/types";
import { applyProductConfig } from "../config/product";
import type { OrgResolutionResult } from "../services/bamboo/orgResolver";

function teamDetectionFromPrefs(
  prefs: AppPreferences,
): OrgResolutionResult | null {
  if (!prefs.teamDetection) {
    return null;
  }
  return prefs.teamDetection as unknown as OrgResolutionResult;
}

export interface FeedbackTeamContextValue {
  prefs: AppPreferences;
  updatePrefs: (patch: Partial<AppPreferences>) => Promise<void>;
  teamDetection: OrgResolutionResult | null;
  teamSnapshot: TeamSnapshot | null;
  teamLoading: boolean;
  teamError: string | null;
  refreshTeam: () => Promise<void>;
}

const FeedbackTeamContext = createContext<FeedbackTeamContextValue | null>(null);

export function FeedbackTeamProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useCurrentUser();
  const [prefs, setPrefs] = useState<AppPreferences | null>(null);
  const [teamSnapshot, setTeamSnapshot] = useState<TeamSnapshot | null>(null);
  const [teamDetection, setTeamDetection] = useState<OrgResolutionResult | null>(
    null,
  );
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    void loadPreferences().then((loaded) => {
      const merged = applyProductConfig(loaded);
      setPrefs(merged);
      setFeedbackPrefsSnapshot(merged);
      setTeamDetection(teamDetectionFromPrefs(merged));
    });
  }, [currentUser.person.id]);

  const refreshTeam = useCallback(async () => {
    if (!prefs) return;
    setTeamLoading(true);
    setTeamError(null);
    try {
      const data = await fetchPerformanceData("30d", "team", "team");
      setTeamSnapshot(data.teamSnapshot);
      setTeamDetection(teamDetectionFromPrefs(prefs));
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Jira team load failed.");
    } finally {
      setTeamLoading(false);
    }
  }, [prefs, currentUser.person.id]);

  useEffect(() => {
    if (prefs) {
      void refreshTeam();
    }
  }, [prefs, refreshTeam]);

  const updatePrefs = useCallback(async (patch: Partial<AppPreferences>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    await savePreferences(next);
    setPrefs(next);
    setFeedbackPrefsSnapshot(next);
  }, [prefs]);

  const value = useMemo((): FeedbackTeamContextValue | null => {
    if (!prefs) return null;
    return {
      prefs,
      updatePrefs,
      teamDetection,
      teamSnapshot,
      teamLoading,
      teamError,
      refreshTeam,
    };
  }, [
    prefs,
    updatePrefs,
    teamDetection,
    teamSnapshot,
    teamLoading,
    teamError,
    refreshTeam,
  ]);

  if (!value) {
    return (
      <div className="page-content">
        <p className="page-content__lead">Loading feedback workspace…</p>
      </div>
    );
  }

  return (
    <FeedbackTeamContext.Provider value={value}>
      {children}
    </FeedbackTeamContext.Provider>
  );
}

export function useFeedbackTeam(): FeedbackTeamContextValue {
  const ctx = useContext(FeedbackTeamContext);
  if (!ctx) {
    throw new Error("useFeedbackTeam must be used within FeedbackTeamProvider");
  }
  return ctx;
}

/** Drop-in for legacy `useAppStore()` shape used by ported Feedback views. */
export function useFeedbackAppStore() {
  const ctx = useFeedbackTeam();
  return {
    prefs: ctx.prefs,
    teamDetection: ctx.teamDetection,
    teamSnapshot: ctx.teamSnapshot,
    updatePrefs: ctx.updatePrefs,
  };
}
