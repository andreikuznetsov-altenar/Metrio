import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { MetricCardData, PerformanceReviewTarget, TrendCardData } from "../domain/performance";
import { usePerformanceData } from "./PerformanceDataContext";
import {
  buildMetricDrilldownRequest,
  buildTrendDrilldownRequest,
  useAnalyticsEvidence,
  type AnalyticsDrilldownRequest,
} from "../pages/performance/analyticsDrilldownModel";

export type PersonDrawerTab = "overview" | "work" | "history";
export type PersonDrawerView = "profile" | "brief";

export interface OpenPersonDrawerOptions {
  personId: string;
  tab?: PersonDrawerTab;
  view?: PersonDrawerView;
}

export interface PerformanceAnalyticsContextValue {
  personId: string | null;
  personTab: PersonDrawerTab;
  personDrawerView: PersonDrawerView;
  personDrawerOpen: boolean;
  openPersonDrawer: (options: OpenPersonDrawerOptions) => void;
  closePersonDrawer: () => void;
  clearPersonDrawer: () => void;
  setPersonDrawerView: (view: PersonDrawerView) => void;
  drilldownOpen: boolean;
  drilldownRequest: AnalyticsDrilldownRequest | null;
  drilldownEvidence: ReturnType<typeof useAnalyticsEvidence>;
  summaryMetric?: MetricCardData;
  openPersonAnalyticsDrilldown: (
    personId: string,
    request: AnalyticsDrilldownRequest,
    source?: HTMLElement | null,
    metric?: MetricCardData,
  ) => void;
  openTeamMetricDrilldown: (metric: MetricCardData, source: HTMLElement) => void;
  openTeamTrendDrilldown: (
    trend: TrendCardData,
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => void;
  openPersonMetricDrilldown: (
    personId: string,
    personDisplayName: string,
    metric: MetricCardData,
    source: HTMLElement,
  ) => void;
  openPersonTrendDrilldown: (
    personId: string,
    personDisplayName: string,
    trend: TrendCardData,
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => void;
  closeDrilldown: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

const PerformanceAnalyticsContext =
  createContext<PerformanceAnalyticsContextValue | null>(null);

export function usePerformanceAnalytics(): PerformanceAnalyticsContextValue {
  const value = useContext(PerformanceAnalyticsContext);
  if (!value) {
    throw new Error("usePerformanceAnalytics requires PerformanceAnalyticsProvider");
  }
  return value;
}

export function useOptionalPerformanceAnalytics(): PerformanceAnalyticsContextValue | null {
  return useContext(PerformanceAnalyticsContext);
}

export function canOpenAnalyticsDrilldown(
  request: Pick<AnalyticsDrilldownRequest, "personId">,
  canOpenPerson: (personId: string) => boolean,
  allowTeamAnalytics: boolean,
): boolean {
  if (request.personId) {
    return canOpenPerson(request.personId);
  }
  return allowTeamAnalytics;
}

export interface PerformanceAnalyticsProviderProps {
  reviewTarget: PerformanceReviewTarget;
  canOpenPerson: (personId: string) => boolean;
  /** Team-scoped metric/trend drill-down (managers with team dashboard). */
  allowTeamAnalytics?: boolean;
  children: ReactNode;
}

export function PerformanceAnalyticsProvider({
  reviewTarget,
  canOpenPerson,
  allowTeamAnalytics = false,
  children,
}: PerformanceAnalyticsProviderProps) {
  const { data } = usePerformanceData();
  const [personId, setPersonId] = useState<string | null>(null);
  const [personTab, setPersonTab] = useState<PersonDrawerTab>("overview");
  const [personDrawerView, setPersonDrawerView] =
    useState<PersonDrawerView>("profile");
  const [personDrawerOpen, setPersonDrawerOpen] = useState(false);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownRequest, setDrilldownRequest] =
    useState<AnalyticsDrilldownRequest | null>(null);
  const [summaryMetric, setSummaryMetric] = useState<MetricCardData | undefined>();
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const drilldownEvidence = useAnalyticsEvidence(
    data,
    reviewTarget,
    drilldownOpen ? drilldownRequest : null,
    summaryMetric,
  );

  useEffect(() => {
    setDrilldownOpen(false);
    setDrilldownRequest(null);
  }, [
    data?.reportData.params.dateFrom,
    data?.reportData.params.dateTo,
    data?.reportData.params.teamScope,
    reviewTarget,
  ]);

  const openPersonDrawer = useCallback(
    ({
      personId: nextPersonId,
      tab = "overview",
      view = "profile",
    }: OpenPersonDrawerOptions) => {
      if (!canOpenPerson(nextPersonId)) return;
      setPersonId(nextPersonId);
      setPersonTab(tab);
      setPersonDrawerView(view);
      setPersonDrawerOpen(true);
    },
    [canOpenPerson],
  );

  const closePersonDrawer = useCallback(() => {
    setPersonDrawerOpen(false);
  }, []);

  const clearPersonDrawer = useCallback(() => {
    setPersonId(null);
    setPersonTab("overview");
    setPersonDrawerView("profile");
  }, []);

  const openDrilldown = useCallback(
    (
      request: AnalyticsDrilldownRequest,
      source: HTMLElement | null,
      metric?: MetricCardData,
    ) => {
      if (!canOpenAnalyticsDrilldown(request, canOpenPerson, allowTeamAnalytics)) {
        return;
      }
      setPersonDrawerOpen(false);
      returnFocusRef.current = source;
      setSummaryMetric(metric);
      setDrilldownRequest(request);
      setDrilldownOpen(true);
    },
    [allowTeamAnalytics, canOpenPerson],
  );

  const openPersonAnalyticsDrilldown = useCallback(
    (
      scopedPersonId: string,
      request: AnalyticsDrilldownRequest,
      source: HTMLElement | null = null,
      metric?: MetricCardData,
    ) => {
      if (!canOpenPerson(scopedPersonId)) return;
      openDrilldown(
        {
          ...request,
          personId: scopedPersonId,
          personDisplayName: request.personDisplayName,
        },
        source,
        metric,
      );
    },
    [canOpenPerson, openDrilldown],
  );

  const openTeamMetricDrilldown = useCallback(
    (metric: MetricCardData, source: HTMLElement) => {
      const request = buildMetricDrilldownRequest(metric);
      if (!request) return;
      openDrilldown(request, source, metric);
    },
    [openDrilldown],
  );

  const openTeamTrendDrilldown = useCallback(
    (
      trend: TrendCardData,
      point: { date: string; value: number },
      source: HTMLElement | null,
    ) => {
      const request = buildTrendDrilldownRequest(trend, point);
      if (!request) return;
      openDrilldown(request, source);
    },
    [openDrilldown],
  );

  const openPersonMetricDrilldown = useCallback(
    (
      scopedPersonId: string,
      personDisplayName: string,
      metric: MetricCardData,
      source: HTMLElement,
    ) => {
      const request = buildMetricDrilldownRequest(metric, {
        personId: scopedPersonId,
        personDisplayName,
      });
      if (!request) return;
      openPersonAnalyticsDrilldown(scopedPersonId, request, source, metric);
    },
    [openPersonAnalyticsDrilldown],
  );

  const openPersonTrendDrilldown = useCallback(
    (
      scopedPersonId: string,
      personDisplayName: string,
      trend: TrendCardData,
      point: { date: string; value: number },
      source: HTMLElement | null,
    ) => {
      const request = buildTrendDrilldownRequest(trend, point, {
        personId: scopedPersonId,
        personDisplayName,
      });
      if (!request) return;
      openPersonAnalyticsDrilldown(scopedPersonId, request, source);
    },
    [openPersonAnalyticsDrilldown],
  );

  const closeDrilldown = useCallback(() => {
    setDrilldownOpen(false);
  }, []);

  const value = useMemo(
    (): PerformanceAnalyticsContextValue => ({
      personId,
      personTab,
      personDrawerView,
      personDrawerOpen,
      openPersonDrawer,
      closePersonDrawer,
      clearPersonDrawer,
      setPersonDrawerView,
      drilldownOpen,
      drilldownRequest,
      drilldownEvidence,
      summaryMetric,
      openPersonAnalyticsDrilldown,
      openTeamMetricDrilldown,
      openTeamTrendDrilldown,
      openPersonMetricDrilldown,
      openPersonTrendDrilldown,
      closeDrilldown,
      returnFocusRef,
    }),
    [
      personId,
      personTab,
      personDrawerView,
      personDrawerOpen,
      openPersonDrawer,
      closePersonDrawer,
      clearPersonDrawer,
      drilldownOpen,
      drilldownRequest,
      drilldownEvidence,
      summaryMetric,
      openPersonAnalyticsDrilldown,
      openTeamMetricDrilldown,
      openTeamTrendDrilldown,
      openPersonMetricDrilldown,
      openPersonTrendDrilldown,
      closeDrilldown,
    ],
  );

  return (
    <PerformanceAnalyticsContext.Provider value={value}>
      {children}
    </PerformanceAnalyticsContext.Provider>
  );
}

export const PERSON_DRAWER_CLOSE_EVENT = "metrio-close-person-drawer";

export function dispatchClosePersonDrawer(): void {
  window.dispatchEvent(new CustomEvent(PERSON_DRAWER_CLOSE_EVENT));
}

export function dispatchOpenPersonDetail(
  detail: string | { personId: string; tab?: PersonDrawerTab },
): void {
  window.dispatchEvent(new CustomEvent("metrio-open-person", { detail }));
}

export function dispatchOpenPersonBrief(detail: {
  personId: string;
  periodPreset?: import("../domain/performance").DateRangeKey;
  prepForOneOnOne?: boolean;
}): void {
  window.dispatchEvent(
    new CustomEvent("metrio-open-person-brief", { detail }),
  );
}
