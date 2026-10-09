import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PerformanceReviewTarget } from "../domain/performance";
import {
  buildPerformanceDatasetKey,
  dateRangeKeyFromPerformanceRange,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import type { PerformanceAudience } from "../domain/performance/reportParams";
import {
  isLatestPerformanceRequest,
  PERFORMANCE_OVERLAY_MIN_MS,
} from "./performanceLoadGuard";
import {
  derivePerformanceUiState,
  type PerformanceUiState,
} from "./performanceUiState";
import { useMinimumVisibleDuration } from "./useMinimumVisibleDuration";
import { fetchPerformanceData } from "../services/performance/performanceDataService";
import {
  applyPerformanceRefreshSideEffects,
  markPerformanceIntegrationsStale,
} from "../services/performance/performanceRefreshSideEffects";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import {
  buildPerformanceViewModels,
  type PerformanceViewModels,
} from "../services/performance/performanceViewModel";
import { registerCoalescedBackgroundRefresh } from "../services/refresh/backgroundRefresh";
import { shouldRefreshOnSystemResume } from "../services/refresh/performanceRefreshCadence";
import { DEFAULT_OPERATIONAL_RULES } from "../domain/operationalRules/operationalRulesDefaults";
import { useOptionalCurrentUser } from "./CurrentUserContext";
import type { OperationalRules } from "../domain/operationalRules/operationalRulesTypes";
import { createCoalescedRefresh } from "../services/refresh/refreshCoordinator";
import { categorizeError } from "../platform/observability/errorCategory";
import {
  noteRefreshFailed,
  recordIntegrationRefresh,
} from "../platform/observability/observabilityStore";
import { classifyJiraRefreshFailure } from "../platform/jiraRefreshErrors";
import { writeLog } from "../platform/logger";
import {
  installKpiReconciliationDevTools,
  registerKpiReconciliationDataSource,
} from "../domain/analytics/kpiReconciliationDev";
import {
  DASHBOARD_CACHE_SCHEMA_VERSION,
  loadDashboardCache,
  saveDashboardCache,
  type DashboardCacheIdentity,
} from "../platform/dashboard/dashboardCache";
import { buildIssueCatalog, type IssueCatalog } from "../domain/jira/issueCatalog";
import { PerformanceIssueCatalogProvider } from "./PerformanceIssueCatalogContext";
import { TaskJourneyProvider } from "./TaskJourneyContext";
import { flattenTeamKpiIssues } from "../domain/analytics/analyticsReportScope";

export type PerformanceLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "refreshing"
  | "partial"
  | "error";

export interface PerformanceDataContextValue {
  status: PerformanceLoadStatus;
  data: PerformanceFetchResult | null;
  viewModels: PerformanceViewModels | null;
  loadingMessage: string | null;
  errorMessage: string | null;
  stale: boolean;
  /**
   * True only after a refresh actually failed while a previous dataset remains usable.
   * Stays latched across retry-in-progress so the global panel does not flicker.
   */
  refreshFailedWithUsableCache: boolean;
  refresh: () => Promise<void>;
  refreshing: boolean;
  contentLoadingActive: boolean;
  contentOverlayVisible: boolean;
  performanceControlsDisabled: boolean;
  uiState: PerformanceUiState;
  longLoadingMessage: string | null;
  /** True while the visible snapshot came from disk and a fetch is in flight or failed. */
  revalidatingFromCache: boolean;
  performanceLastUpdatedAt: string | null;
  /** Wall-clock ms when the current loading/refresh cycle started; cleared when settled. */
  refreshStartedAt: number | null;
  issueCatalog: IssueCatalog;
}

const PerformanceDataContext =
  createContext<PerformanceDataContextValue | null>(null);

function errorMessageFromError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/bamboo/i.test(message)) {
    return "Couldn't refresh Bamboo data.";
  }
  if (/jira/i.test(message)) {
    return "Couldn't refresh Jira data.";
  }
  return "Couldn't refresh performance data.";
}

export interface PerformanceDataProviderProps {
  /** When false, skip fetch lifecycle (disconnected / gated shell). */
  enabled: boolean;
  /** Visible loading overlay only on Performance surfaces. */
  showLoadingOverlay?: boolean;
  dateRange: PerformanceDateRange;
  reviewTarget: PerformanceReviewTarget;
  audience: PerformanceAudience;
  selfPersonId: string;
  managerTeamTray: boolean;
  operationalRules?: OperationalRules;
  children: ReactNode;
}

type LoadMode = "initial" | "refresh" | "silent";

export function PerformanceDataProvider({
  enabled,
  showLoadingOverlay = true,
  dateRange,
  reviewTarget,
  audience,
  selfPersonId,
  managerTeamTray,
  operationalRules = DEFAULT_OPERATIONAL_RULES,
  children,
}: PerformanceDataProviderProps) {
  const currentUserCtx = useOptionalCurrentUser();
  const userRole = currentUserCtx?.currentUser.person.role ?? "employee";
  const [data, setData] = useState<PerformanceFetchResult | null>(null);
  const [viewModels, setViewModels] = useState<PerformanceViewModels | null>(
    null,
  );
  const [status, setStatus] = useState<PerformanceLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshFailedWithUsableCache, setRefreshFailedWithUsableCache] =
    useState(false);
  const [longLoadingMessage, setLongLoadingMessage] = useState<string | null>(
    null,
  );
  const [revalidatingFromCache, setRevalidatingFromCache] = useState(false);
  const [refreshStartedAt, setRefreshStartedAt] = useState<number | null>(null);
  const dataRef = useRef(data);
  const viewModelsRef = useRef(viewModels);
  const managerTeamTrayRef = useRef(managerTeamTray);
  const requestSeqRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const datasetKeyRef = useRef<string | null>(null);
  const appliedRulesKeyRef = useRef<string | null>(null);
  dataRef.current = data;
  viewModelsRef.current = viewModels;
  managerTeamTrayRef.current = managerTeamTray;
  useEffect(() => {
    installKpiReconciliationDevTools();
  }, []);

  const contentLoadingActive =
    showLoadingOverlay &&
    enabled &&
    (status === "loading" || status === "refreshing") &&
    viewModels == null &&
    !revalidatingFromCache;
  const contentOverlayVisible = useMinimumVisibleDuration(
    contentLoadingActive,
    PERFORMANCE_OVERLAY_MIN_MS,
  );
  const performanceControlsDisabled =
    contentLoadingActive || contentOverlayVisible;

  const uiState = derivePerformanceUiState({ status, viewModels, stale });

  useEffect(() => {
    if (status === "loading" || status === "refreshing") {
      setRefreshStartedAt((prev) => prev ?? Date.now());
    } else {
      setRefreshStartedAt(null);
    }
  }, [status]);

  const datasetKey = useMemo(
    () =>
      buildPerformanceDatasetKey({
        dateRange,
        reviewTarget,
        audience,
        selfPersonId,
      }),
    [audience, dateRange, reviewTarget, selfPersonId],
  );

  useEffect(() => {
    if (!contentLoadingActive) {
      setLongLoadingMessage(null);
      return;
    }
    setLongLoadingMessage(null);
    const timer = window.setTimeout(() => {
      setLongLoadingMessage("Still loading Jira and Bamboo data…");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [contentLoadingActive, dateRange, reviewTarget, audience]);

  const load = useCallback(
    async (mode: LoadMode) => {
      if (!enabled) {
        return;
      }
      const requestId = ++requestSeqRef.current;
      const hasData = dataRef.current != null;
      const showOverlay = mode !== "silent";
      const cycleStartedAt = Date.now();
      if (showOverlay) {
        setStatus(hasData ? "refreshing" : "loading");
      }
      setErrorMessage(null);
      void writeLog(
        "info",
        "app",
        "performance_refresh_cycle",
        `start mode=${mode} requestId=${requestId} hasCache=${hasData}`,
      );

      try {
        // Manual / initial must bypass Bamboo TTL so a failed source is retried.
        // Silent background ticks reuse Bamboo when its 60m TTL is still valid.
        const next = await fetchPerformanceData(
          dateRange,
          reviewTarget,
          audience,
          { forceBamboo: mode !== "silent" },
        );
        if (!isLatestPerformanceRequest(requestId, requestSeqRef.current)) {
          return;
        }
        const models = buildPerformanceViewModels(
          next,
          selfPersonId,
          dateRangeKeyFromPerformanceRange(dateRange),
          dateRange,
          reviewTarget,
          operationalRules,
        );
        setData(next);
        setViewModels(models);
        appliedRulesKeyRef.current = JSON.stringify(operationalRules);
        registerKpiReconciliationDataSource(next, reviewTarget);
        const partial =
          next.partialWarnings.length > 0 || Boolean(models.statusMessage);
        setStatus(partial ? "partial" : "ready");
        setStale(false);
        setRefreshFailedWithUsableCache(false);
        setRevalidatingFromCache(false);
        setErrorMessage(null);
        void writeLog(
          "info",
          "app",
          "performance_refresh_cycle",
          `success mode=${mode} requestId=${requestId} durationMs=${Date.now() - cycleStartedAt} partialWarnings=${next.partialWarnings.length}`,
        );
        const cacheIdentity: DashboardCacheIdentity = {
          selfPersonId,
          role: userRole,
          datasetKey,
          workEmail:
            next.identityResolution.find((r) => r.matched)?.workEmail ||
            undefined,
        };
        void saveDashboardCache({
          schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
          savedAt: new Date().toISOString(),
          sourceLastUpdatedAt: next.lastUpdatedAt,
          identity: cacheIdentity,
          fetchResult: next,
        }).catch(() => undefined);
        // Side effects (tray/notifications) are OPTIONAL relative to CORE workspace data.
        // A tray/write failure must not mark a successful core refresh as failed.
        try {
          await applyPerformanceRefreshSideEffects(next, {
            selfPersonId,
            role: userRole,
            viewModels: models,
            currentUser: currentUserCtx?.currentUser ?? null,
          });
        } catch (sideEffectError) {
          void writeLog(
            "warn",
            "app",
            "performance_refresh_side_effects",
            `Post-refresh side effects failed after successful core snapshot: ${
              sideEffectError instanceof Error
                ? sideEffectError.message
                : String(sideEffectError)
            }`,
          );
        }
      } catch (error) {
        if (!isLatestPerformanceRequest(requestId, requestSeqRef.current)) {
          return;
        }
        const message = errorMessageFromError(error);
        noteRefreshFailed();
        const category = categorizeError(error);
        const jiraFailure = classifyJiraRefreshFailure(error, Boolean(dataRef.current));
        const bambooOnly = /bamboo/i.test(message) && !/jira/i.test(message);
        void writeLog(
          "warn",
          "app",
          "performance_refresh_failed",
          `CORE refresh failed mode=${mode} requestId=${requestId} durationMs=${Date.now() - cycleStartedAt} kind=${jiraFailure.kind} code=${jiraFailure.code ?? "n/a"} category=${category}${
            jiraFailure.issueKey ? ` issueKey=${jiraFailure.issueKey}` : ""
          } detail=${jiraFailure.logDetail}`,
        );
        if (!bambooOnly) {
          recordIntegrationRefresh(
            "jira",
            "Jira",
            "failed",
            0,
            category,
            jiraFailure.kind === "credential" || jiraFailure.kind === "access"
              ? jiraFailure.userMessage
              : jiraFailure.logDetail,
          );
        }
        if (/bamboo/i.test(message)) {
          recordIntegrationRefresh("bamboo", "BambooHR", "failed", 0, category);
        }
        setErrorMessage(
          !bambooOnly &&
            (jiraFailure.kind === "credential" || jiraFailure.kind === "access")
            ? jiraFailure.userMessage
            : message,
        );
        if (dataRef.current) {
          setStale(true);
          setRefreshFailedWithUsableCache(true);
          setRevalidatingFromCache(true);
          setStatus("partial");
          await markPerformanceIntegrationsStale({
            jira: !bambooOnly,
            bamboo: /bamboo/i.test(message),
          });
        } else {
          setRefreshFailedWithUsableCache(false);
          if (showOverlay) {
            setStatus("error");
          }
        }
      }
    },
    [
      dateRange,
      reviewTarget,
      audience,
      enabled,
      selfPersonId,
      operationalRules,
      userRole,
      currentUserCtx?.currentUser,
      datasetKey,
    ],
  );

  useEffect(() => {
    const current = dataRef.current;
    if (!current || !enabled) return;
    const rulesKey = JSON.stringify(operationalRules);
    if (rulesKey === appliedRulesKeyRef.current) return;
    appliedRulesKeyRef.current = rulesKey;
    const models = buildPerformanceViewModels(
      current,
      selfPersonId,
      dateRangeKeyFromPerformanceRange(dateRange),
      dateRange,
      reviewTarget,
      operationalRules,
    );
    setViewModels(models);
  }, [operationalRules, dateRange, reviewTarget, selfPersonId, enabled]);

  const coalescedLoadRef = useRef(createCoalescedRefresh(() => load("refresh")));

  useEffect(() => {
    coalescedLoadRef.current = createCoalescedRefresh(() => load("refresh"));
  }, [load]);

  const coalescedSilentRef = useRef(createCoalescedRefresh(() => load("silent")));

  useEffect(() => {
    coalescedSilentRef.current = createCoalescedRefresh(() => load("silent"));
  }, [load]);

  const refresh = useCallback(async () => {
    await coalescedLoadRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const keyChanged =
        bootstrappedRef.current && datasetKeyRef.current !== datasetKey;

      if (!bootstrappedRef.current) {
        const cached = await loadDashboardCache({
          datasetKey,
          selfPersonId,
          role: userRole,
        });
        if (cancelled) return;

        datasetKeyRef.current = datasetKey;

        if (cached) {
          const models = buildPerformanceViewModels(
            cached.fetchResult,
            selfPersonId,
            dateRangeKeyFromPerformanceRange(dateRange),
            dateRange,
            reviewTarget,
            operationalRules,
          );
          setData(cached.fetchResult);
          setViewModels(models);
          dataRef.current = cached.fetchResult;
          viewModelsRef.current = models;
          appliedRulesKeyRef.current = JSON.stringify(operationalRules);
          registerKpiReconciliationDataSource(cached.fetchResult, reviewTarget);
          setStale(true);
          setRevalidatingFromCache(true);
          await load("refresh");
        } else {
          await load("initial");
        }
        if (cancelled) return;
        bootstrappedRef.current = true;
        return;
      }

      if (keyChanged) {
        datasetKeyRef.current = datasetKey;
        const cached = await loadDashboardCache({
          datasetKey,
          selfPersonId,
          role: userRole,
        });
        if (cancelled) return;
        if (cached) {
          const models = buildPerformanceViewModels(
            cached.fetchResult,
            selfPersonId,
            dateRangeKeyFromPerformanceRange(dateRange),
            dateRange,
            reviewTarget,
            operationalRules,
          );
          setData(cached.fetchResult);
          setViewModels(models);
          dataRef.current = cached.fetchResult;
          viewModelsRef.current = models;
          appliedRulesKeyRef.current = JSON.stringify(operationalRules);
          registerKpiReconciliationDataSource(cached.fetchResult, reviewTarget);
          setStale(true);
          setRevalidatingFromCache(true);
        } else if (!dataRef.current) {
          setData(null);
          setViewModels(null);
          dataRef.current = null;
          viewModelsRef.current = null;
          setRevalidatingFromCache(false);
        }
        await coalescedLoadRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    audience,
    datasetKey,
    dateRange,
    enabled,
    load,
    operationalRules,
    reviewTarget,
    selfPersonId,
    userRole,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let disposed = false;
    let unregister: (() => void) | undefined;

    void (async () => {
      try {
        const unsub = await registerCoalescedBackgroundRefresh({
          refresh: async () => {
            await coalescedSilentRef.current();
          },
          shouldRefreshOnResume: () =>
            shouldRefreshOnSystemResume(
              dataRef.current?.lastUpdatedAt ?? null,
            ),
        });
        if (disposed) {
          unsub();
          return;
        }
        unregister = unsub;
      } catch {
        // Tauri event API unavailable outside the desktop host.
      }
    })();

    return () => {
      disposed = true;
      unregister?.();
    };
  }, [enabled]);

  const loadingMessage =
    status === "loading" || status === "refreshing"
      ? "Fetching team data…"
      : null;

  const refreshing = status === "refreshing";

  const issueCatalog = useMemo(
    () =>
      buildIssueCatalog({
        persons: [
          ...(data?.teamSnapshot?.persons ?? []),
          ...(data?.historyTeamSnapshot?.persons ?? []),
        ],
        issues: [
          ...flattenTeamKpiIssues(data?.reportData.grouped ?? {}),
          ...flattenTeamKpiIssues(data?.historyReportData.grouped ?? {}),
        ],
      }),
    [
      data?.teamSnapshot?.persons,
      data?.historyTeamSnapshot?.persons,
      data?.reportData.grouped,
      data?.historyReportData.grouped,
    ],
  );

  const value = useMemo(
    (): PerformanceDataContextValue => ({
      status,
      data,
      viewModels,
      loadingMessage,
      errorMessage,
      stale,
      refreshFailedWithUsableCache,
      refresh,
      refreshing,
      contentLoadingActive,
      contentOverlayVisible,
      performanceControlsDisabled,
      uiState,
      longLoadingMessage,
      revalidatingFromCache,
      performanceLastUpdatedAt: data?.lastUpdatedAt ?? null,
      refreshStartedAt,
      issueCatalog,
    }),
    [
      status,
      data,
      viewModels,
      issueCatalog,
      loadingMessage,
      errorMessage,
      stale,
      refreshFailedWithUsableCache,
      refresh,
      refreshing,
      contentLoadingActive,
      contentOverlayVisible,
      performanceControlsDisabled,
      uiState,
      longLoadingMessage,
      revalidatingFromCache,
      refreshStartedAt,
    ],
  );

  return (
    <PerformanceIssueCatalogProvider catalog={issueCatalog}>
      <PerformanceDataContext.Provider value={value}>
        <TaskJourneyProvider>{children}</TaskJourneyProvider>
      </PerformanceDataContext.Provider>
    </PerformanceIssueCatalogProvider>
  );
}

export function usePerformanceData(): PerformanceDataContextValue {
  const ctx = useContext(PerformanceDataContext);
  if (!ctx) {
    throw new Error("usePerformanceData must be used within PerformanceDataProvider");
  }
  return ctx;
}

export function useOptionalPerformanceData(): PerformanceDataContextValue | null {
  return useContext(PerformanceDataContext);
}

