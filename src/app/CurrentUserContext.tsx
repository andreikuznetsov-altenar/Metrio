import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildCurrentUserFromTeamDetection } from "../domain/currentUser/fromTeamDetection";
import type { CurrentUser, DevFixtureId } from "../domain/types";
import { getFixtureUser } from "../fixtures/currentUsers";
import { loadPreferences } from "../platform/preferences";
import {
  validateWorkspacePreferences,
  WORKSPACE_LOAD_ERROR_MESSAGE,
  type WorkspaceStatus,
} from "./workspaceSession";

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

function initialWorkspaceStatus(): WorkspaceStatus {
  return import.meta.env.DEV ? "ready" : "idle";
}

interface CurrentUserContextValue {
  currentUser: CurrentUser;
  devFixtureId: DevFixtureId;
  setDevFixture: (fixtureId: DevFixtureId) => void;
  isDevFixtureMode: boolean;
  workspaceStatus: WorkspaceStatus;
  workspaceError: string | null;
  initializeWorkspace: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [devFixtureId, setDevFixtureIdState] = useState<DevFixtureId>(
    readInitialFixture,
  );
  const [productionUser, setProductionUser] = useState<CurrentUser | null>(
    null,
  );
  const [workspaceStatus, setWorkspaceStatus] =
    useState<WorkspaceStatus>(initialWorkspaceStatus);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const initializeWorkspace = useCallback(async () => {
    if (import.meta.env.DEV) {
      setWorkspaceStatus("ready");
      setWorkspaceError(null);
      return;
    }

    setWorkspaceStatus("initializing");
    setWorkspaceError(null);

    try {
      const prefs = await loadPreferences();
      const validation = validateWorkspacePreferences(prefs);
      if (!validation.ok) {
        setWorkspaceStatus("error");
        setWorkspaceError(validation.message);
        return;
      }

      const fromTeam = prefs.teamDetection
        ? buildCurrentUserFromTeamDetection(prefs.teamDetection)
        : null;
      setProductionUser(fromTeam);
      setWorkspaceStatus("ready");
    } catch {
      setWorkspaceStatus("error");
      setWorkspaceError(WORKSPACE_LOAD_ERROR_MESSAGE);
    }
  }, []);

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
      workspaceStatus,
      workspaceError,
      initializeWorkspace,
    }),
    [
      currentUser,
      devFixtureId,
      setDevFixture,
      workspaceStatus,
      workspaceError,
      initializeWorkspace,
    ],
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
