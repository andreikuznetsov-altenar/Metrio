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
import {
  loadPreferencesOutcome,
  type AppPreferences,
} from "../platform/preferences";
import {
  invalidateAuthenticatedSession,
} from "./ConnectionContext";
import {
  SESSION_STORAGE_ERROR_MESSAGE,
  logWorkspaceBootstrap,
} from "./appSession";
import {
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

function applyProductionUser(prefs: AppPreferences): CurrentUser | null {
  return prefs.teamDetection
    ? buildCurrentUserFromTeamDetection(prefs.teamDetection)
    : null;
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
  const [bootstrapGeneration, setBootstrapGeneration] = useState(0);

  const initializeWorkspace = useCallback(async () => {
    if (import.meta.env.DEV) {
      setWorkspaceStatus("ready");
      setWorkspaceError(null);
      return;
    }

    setWorkspaceStatus("initializing");
    setWorkspaceError(null);

    const outcome = await loadPreferencesOutcome();
    if (!outcome.ok) {
      logWorkspaceBootstrap({
        connectionMarkerPresent: true,
        preferencesLoaded: false,
        failedStage: "preferences_load",
        sanitizedReason: outcome.reason,
      });
      setWorkspaceStatus("error");
      setWorkspaceError(SESSION_STORAGE_ERROR_MESSAGE);
      return;
    }

    logWorkspaceBootstrap({
      connectionMarkerPresent: true,
      preferencesLoaded: true,
      preferencesSource: outcome.source,
      preferencesWarning: outcome.warning,
      setupCompleted: outcome.prefs.setup?.completed ?? false,
      teamDetectionPresent: Boolean(outcome.prefs.teamDetection),
    });

    if (outcome.source !== "file" || !outcome.prefs.setup?.completed) {
      invalidateAuthenticatedSession();
      return;
    }

    setProductionUser(applyProductionUser(outcome.prefs));
    setWorkspaceStatus("ready");
    setBootstrapGeneration((value) => value + 1);
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
  }, [devFixtureId, productionUser, bootstrapGeneration]);

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
