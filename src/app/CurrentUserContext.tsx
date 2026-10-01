import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildCurrentUserFromTeamDetection } from "../domain/currentUser/fromTeamDetection";
import type { CurrentUser, DevFixtureId } from "../domain/types";
import { getFixtureUser } from "../fixtures/currentUsers";
import { loadPreferences } from "../platform/preferences";

const DEV_FIXTURE_STORAGE_KEY = "metrio-dev-fixture";

function readInitialFixture(): DevFixtureId {
  if (!import.meta.env.DEV) {
    return "employee";
  }
  const stored = localStorage.getItem(DEV_FIXTURE_STORAGE_KEY);
  if (stored === "employee" || stored === "lead" || stored === "director") {
    return stored;
  }
  return "employee";
}

interface CurrentUserContextValue {
  currentUser: CurrentUser;
  devFixtureId: DevFixtureId;
  setDevFixture: (fixtureId: DevFixtureId) => void;
  isDevFixtureMode: boolean;
  refreshFromPreferences: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [devFixtureId, setDevFixtureIdState] = useState<DevFixtureId>(
    readInitialFixture,
  );
  const [productionUser, setProductionUser] = useState<CurrentUser | null>(
    null,
  );

  const refreshFromPreferences = useCallback(async () => {
    if (import.meta.env.DEV) {
      return;
    }
    const prefs = await loadPreferences();
    const fromTeam = prefs.teamDetection
      ? buildCurrentUserFromTeamDetection(prefs.teamDetection)
      : null;
    setProductionUser(fromTeam);
  }, []);

  useEffect(() => {
    void refreshFromPreferences();
  }, [refreshFromPreferences]);

  const setDevFixture = useCallback((fixtureId: DevFixtureId) => {
    if (!import.meta.env.DEV) {
      return;
    }
    localStorage.setItem(DEV_FIXTURE_STORAGE_KEY, fixtureId);
    setDevFixtureIdState(fixtureId);
  }, []);

  const currentUser = useMemo(() => {
    if (import.meta.env.DEV) {
      return getFixtureUser(devFixtureId);
    }
    return productionUser ?? getFixtureUser("employee");
  }, [devFixtureId, productionUser]);

  const value = useMemo(
    () => ({
      currentUser,
      devFixtureId,
      setDevFixture,
      isDevFixtureMode: import.meta.env.DEV,
      refreshFromPreferences,
    }),
    [currentUser, devFixtureId, setDevFixture, refreshFromPreferences],
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return ctx;
}
