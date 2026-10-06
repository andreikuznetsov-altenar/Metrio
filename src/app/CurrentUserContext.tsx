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
import {
  loadPreferencesOutcome,
  PREFERENCES_SAVED_EVENT,
  type AppPreferences,
} from "../platform/preferences";
import {
  invalidateAuthenticatedSession,
} from "./sessionInvalidation";
import {
  SESSION_STORAGE_ERROR_MESSAGE,
  logWorkspaceBootstrap,
} from "./appSession";
import { bootLog } from "./bootDiagnostics";
import { recordStartupPhase } from "../platform/observability/observabilityStore";
import {
  type WorkspaceStatus,
} from "./workspaceSession";

const DEV_FIXTURE_STORAGE_KEY = "metrio-dev-fixture";

/** Shown only while dev fixture module loads; not used for Performance data. */
const PENDING_SHELL_USER: CurrentUser = {
  person: { id: "__pending__", name: "…", role: "employee" },
};

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
  return import.meta.env.DEV ? "initializing" : "idle";
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
  const [devFixtureUser, setDevFixtureUser] = useState<CurrentUser | null>(
    null,
  );
  const [productionUser, setProductionUser] = useState<CurrentUser | null>(
    null,
  );
  const [workspaceStatus, setWorkspaceStatus] =
    useState<WorkspaceStatus>(initialWorkspaceStatus);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [bootstrapGeneration, setBootstrapGeneration] = useState(0);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    let cancelled = false;
    void import("../fixtures/currentUsers").then((module) => {
      if (!cancelled) {
        setDevFixtureUser(module.getFixtureUser(devFixtureId));
        setWorkspaceStatus("ready");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [devFixtureId]);

  const initializeWorkspace = useCallback(async () => {
    if (import.meta.env.DEV) {
      setWorkspaceError(null);
      return;
    }

    setWorkspaceStatus("initializing");
    setWorkspaceError(null);
    bootLog("15", "initializeWorkspace started");
    const workspaceStarted = performance.now();

    const prefsStarted = performance.now();
    const outcome = await loadPreferencesOutcome();
    recordStartupPhase("preferences", Math.round(performance.now() - prefsStarted));
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

    const user = applyProductionUser(outcome.prefs);
    if (!user) {
      setWorkspaceStatus("error");
      setWorkspaceError("Couldn't resolve your team profile from Bamboo.");
      return;
    }

    setProductionUser(user);
    setWorkspaceStatus("ready");
    setBootstrapGeneration((value) => value + 1);
    recordStartupPhase(
      "workspace_ready",
      Math.round(performance.now() - workspaceStarted),
    );
    bootLog("16", "initializeWorkspace finished status=ready");
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const onPrefsSaved = (event: Event) => {
      const prefs = (event as CustomEvent<AppPreferences>).detail;
      if (!prefs?.teamDetection) return;
      const user = buildCurrentUserFromTeamDetection(prefs.teamDetection);
      setProductionUser(user);
      setBootstrapGeneration((value) => value + 1);
    };
    window.addEventListener(PREFERENCES_SAVED_EVENT, onPrefsSaved);
    return () => window.removeEventListener(PREFERENCES_SAVED_EVENT, onPrefsSaved);
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
      return devFixtureUser ?? PENDING_SHELL_USER;
    }
    return productionUser ?? PENDING_SHELL_USER;
  }, [devFixtureId, devFixtureUser, productionUser, bootstrapGeneration]);

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

export function useOptionalCurrentUser(): CurrentUserContextValue | null {
  return useContext(CurrentUserContext);
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return ctx;
}
