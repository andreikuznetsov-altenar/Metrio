import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppShell } from "../components/AppShell/AppShell";
import { bootLog } from "./bootDiagnostics";
import { ScrollArea } from "../components/ScrollArea/ScrollArea";
import type { Person } from "../domain/people/types";
import type { PerformanceReviewTarget } from "../domain/performance";
import {
  readSessionPerformanceDateRange,
  writeSessionPerformanceDateRange,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import { isManagerRole } from "../domain/performance";
import type { AppRoute } from "../domain/types";
import { isFeedbackEnabled } from "./featureGates";
import { resolveOrgFeatureAccess } from "../domain/organization/orgFeatureAccess";
import { FeedbackPage } from "../pages/FeedbackPage";
import { PerformancePage } from "../pages/PerformancePage";
import { HomePage } from "../pages/home/HomePage";
import { WorkGraphShell } from "./WorkGraphShell";
import { CompanyConfigProvider, useOptionalCompanyConfig } from "./CompanyConfigContext";
import { OperationalRulesProvider } from "./OperationalRulesContext";
import { SettingsPage } from "../pages/settings/SettingsPage";
import type { SettingsSection } from "../pages/settings/types";
import { MetrioAppHeader } from "../shell/MetrioAppHeader";
import { CommandPalette } from "../shell/CommandPalette";
import {
  PersonNavigationProvider,
  usePersonNavigation,
} from "./PersonNavigationContext";
import { ProjectCockpitDrawer } from "../pages/project/ProjectCockpitDrawer";
import { DigestDrawer } from "../pages/digest/DigestDrawer";
import { DIGEST_OPEN_EVENT } from "../platform/digestNavigation";
import { useDigestPreferences } from "../hooks/useDigestPreferences";
import type { OperationalDigest } from "../domain/digests/digestTypes";
import { openProjectCockpit } from "../platform/projectCockpitNavigation";
import { useWorkGraph } from "./WorkGraphContext";
import { useTheme } from "../theme/ThemeProvider";
import { resolveJiraBaseUrl } from "../config/product";
import { loadPreferences } from "../platform/preferences";
import { readCalendarCache } from "../platform/calendarCache";
import { buildJiraIssueBrowseUrl } from "../platform/jiraIssueUrl";
import { isCommandPaletteShortcut } from "../platform/commandPaletteShortcut";
import { PerformanceToolbar } from "../shell/PerformanceToolbar";
import { NotificationCenter } from "../shell/NotificationCenter";
import {
  clearNotificationHistory,
  countUnreadNotificationEvents,
  NOTIFICATION_EVENTS_CHANGED,
} from "../platform/notificationEvents";
import { RuntimeShellEffects } from "./RuntimeShellEffects";
import { TrayMenuEffects } from "./TrayMenuEffects";
import { TraySummarySyncEffects } from "./TraySummarySyncEffects";
import { UpdateProvider } from "./UpdateContext";
import { UpdateTrayEffects } from "./UpdateTrayEffects";
import { useCurrentUser } from "./CurrentUserContext";
import { clearConnection } from "./connectionStorage";
import { useConnectionGate } from "./ConnectionContext";
import { logoutSession } from "./logoutSession";
import { clearTrayUserContext } from "../platform/trayActionCenter";
import { usePerformanceData } from "./PerformanceDataContext";
import {
  appNavigate,
  getAppNavigationState,
  subscribeAppNavigation,
} from "./navigationStore";
import { PerformanceDataWithRules } from "./PerformanceDataWithRules";
import {
  PerformanceExportProvider,
  usePerformanceExport,
} from "./PerformanceExportContext";

const MemoHomePage = memo(HomePage);
const MemoPerformancePage = memo(PerformancePage);
const MemoFeedbackPage = memo(FeedbackPage);

function defaultReviewTarget(role: string): PerformanceReviewTarget {
  return role === "employee" ? "personal" : "team";
}

export function AppLayout() {
  const activeRoute = useSyncExternalStore(
    subscribeAppNavigation,
    () => getAppNavigationState().route,
    () => getAppNavigationState().route,
  );
  const setActiveRoute = useCallback((route: AppRoute) => {
    appNavigate({ route });
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("preferences");
  const [dateRange, setDateRangeState] = useState<PerformanceDateRange>(() =>
    readSessionPerformanceDateRange(),
  );
  const setDateRange = useCallback((value: PerformanceDateRange) => {
    writeSessionPerformanceDateRange(value);
    setDateRangeState(value);
  }, []);
  const { currentUser } = useCurrentUser();
  const [reviewTarget, setReviewTarget] = useState<PerformanceReviewTarget>(
    () => defaultReviewTarget(currentUser.person.role),
  );

  useEffect(() => {
    let route = getAppNavigationState().route;
    return subscribeAppNavigation(() => {
      const next = getAppNavigationState().route;
      if (next === route) {
        return;
      }
      route = next;
      setSettingsOpen(false);
    });
  }, []);


  useEffect(() => {
    setReviewTarget(defaultReviewTarget(currentUser.person.role));
  }, [currentUser.person.id, currentUser.person.role]);

  const performanceAudience: "team" | "employee" =
    currentUser.orgRole === "manager_of_managers" ||
    (currentUser.orgRole === "leaf_manager" && currentUser.team) ||
    (isManagerRole(currentUser.person.role) && currentUser.team)
      ? "team"
      : "employee";

  const showTeamPerformanceToolbar =
    currentUser.orgRole === "manager_of_managers" ||
    (currentUser.orgRole === "leaf_manager" && Boolean(currentUser.team)) ||
    (isManagerRole(currentUser.person.role) && Boolean(currentUser.team));

  const performanceSurfaceActive = activeRoute === "performance" && !settingsOpen;

  return (
    <>
      <RuntimeShellEffects />
      <UpdateProvider>
      <CompanyConfigProvider>
      <OperationalRulesProvider>
      <PerformanceDataWithRules
        enabled
        showLoadingOverlay={performanceSurfaceActive}
        dateRange={dateRange}
        reviewTarget={reviewTarget}
        audience={performanceAudience}
        selfPersonId={currentUser.person.id}
        managerTeamTray={performanceAudience === "team"}
      >
        <PerformanceExportProvider
          audience={performanceAudience}
          selfPersonId={currentUser.person.id}
        >
          <WorkGraphShell selfPersonId={currentUser.person.id}>
            <PersonNavigationProvider>
              <AppLayoutShell
                activeRoute={activeRoute}
                setActiveRoute={setActiveRoute}
                settingsOpen={settingsOpen}
                setSettingsOpen={setSettingsOpen}
                settingsSection={settingsSection}
                setSettingsSection={setSettingsSection}
                dateRange={dateRange}
                setDateRange={setDateRange}
                reviewTarget={reviewTarget}
                setReviewTarget={setReviewTarget}
                performanceDataEnabled={
                  activeRoute === "performance" && !settingsOpen
                }
                homeActive={activeRoute === "home" && !settingsOpen}
                performanceToolbarCapable={
                  showTeamPerformanceToolbar ||
                  currentUser.person.role === "employee"
                }
                showEmployeePerformance={
                  activeRoute === "performance" &&
                  !settingsOpen &&
                  currentUser.person.role === "employee"
                }
              />
            </PersonNavigationProvider>
          </WorkGraphShell>
        </PerformanceExportProvider>
      </PerformanceDataWithRules>
      </OperationalRulesProvider>
      </CompanyConfigProvider>
      </UpdateProvider>
    </>
  );
}

interface AppLayoutShellProps {
  activeRoute: AppRoute;
  setActiveRoute: (route: AppRoute) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settingsSection: SettingsSection;
  setSettingsSection: (section: SettingsSection) => void;
  dateRange: PerformanceDateRange;
  setDateRange: (value: PerformanceDateRange) => void;
  reviewTarget: PerformanceReviewTarget;
  setReviewTarget: (value: PerformanceReviewTarget) => void;
  performanceDataEnabled: boolean;
  homeActive: boolean;
  performanceToolbarCapable: boolean;
  showEmployeePerformance: boolean;
}

function AppLayoutShell({
  activeRoute,
  setActiveRoute,
  settingsOpen,
  setSettingsOpen,
  settingsSection,
  setSettingsSection,
  dateRange,
  setDateRange,
  reviewTarget,
  setReviewTarget,
  performanceDataEnabled,
  homeActive,
  performanceToolbarCapable,
  showEmployeePerformance,
}: AppLayoutShellProps) {
  const [paintedRoute, setPaintedRoute] = useState(activeRoute);
  useEffect(() => {
    let cancelled = false;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!cancelled) setPaintedRoute(activeRoute);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [activeRoute]);
  const companyConfig = useOptionalCompanyConfig();
  const { currentUser } = useCurrentUser();
  const feedbackFeatureOn = isFeedbackEnabled(companyConfig?.effective.features);
  const orgFeatureAccess = resolveOrgFeatureAccess(
    currentUser.orgRole ?? "unresolved",
  );
  const feedbackEnabled = feedbackFeatureOn && orgFeatureAccess.showFeedbackTab;
  const { resetConnection, invalidateSession } = useConnectionGate();
  const { openPerson } = usePersonNavigation();
  const {
    refresh,
    performanceControlsDisabled,
    data,
    viewModels,
    status: performanceStatus,
  } = usePerformanceData();
  const reportingNavReady =
    performanceStatus === "ready" ||
    performanceStatus === "partial" ||
    performanceStatus === "refreshing" ||
    (performanceStatus === "loading" && Boolean(data || viewModels)) ||
    (performanceStatus === "error" && Boolean(data)) ||
    Boolean(viewModels);
  const performanceNavEnabled = reportingNavReady;
  const performanceExport = usePerformanceExport();
  const workGraph = useWorkGraph();
  const { preference, setPreference } = useTheme();
  const openAboutSettings = useCallback(() => {
    setSettingsOpen(true);
    setSettingsSection("company-app");
  }, [setSettingsOpen, setSettingsSection]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [projectCockpitKey, setProjectCockpitKey] = useState<string | null>(
    null,
  );
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestKind, setDigestKind] = useState<"daily" | "weekly">("daily");
  const { digest: digestModel } = useDigestPreferences();
  const [paletteJiraBaseUrl, setPaletteJiraBaseUrl] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(() =>
    countUnreadNotificationEvents(),
  );

  useEffect(() => {
    bootLog("17M", "AppLayout mounted");
    setNotificationUnread(countUnreadNotificationEvents());
    const onChanged = () => setNotificationUnread(countUnreadNotificationEvents());
    window.addEventListener(NOTIFICATION_EVENTS_CHANGED, onChanged);
    return () => window.removeEventListener(NOTIFICATION_EVENTS_CHANGED, onChanged);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isCommandPaletteShortcut(event)) {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setPaletteJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  useEffect(() => {
    const onDigest = (event: Event) => {
      const detail = (event as CustomEvent<{ digestKind: "daily" | "weekly" }>)
        .detail;
      if (detail?.digestKind) {
        setDigestKind(detail.digestKind);
        setDigestOpen(true);
      }
    };
    window.addEventListener(DIGEST_OPEN_EVENT, onDigest);
    return () => window.removeEventListener(DIGEST_OPEN_EVENT, onDigest);
  }, []);

  useEffect(() => {
    const onProject = (event: Event) => {
      const detail = (event as CustomEvent<{ projectKey: string }>).detail;
      if (detail?.projectKey) {
        setProjectCockpitKey(detail.projectKey);
      }
    };
    window.addEventListener("metrio-open-project-cockpit", onProject);
    return () =>
      window.removeEventListener("metrio-open-project-cockpit", onProject);
  }, []);

  useEffect(() => {
    const onRoute = (event: Event) => {
      const route = (event as CustomEvent<AppRoute>).detail;
      if (route === "home" || route === "performance" || route === "feedback") {
        if (route === "feedback" && !performanceNavEnabled) {
          return;
        }
        if (route === "performance" && !performanceNavEnabled) {
          return;
        }
        if (route === "feedback" && !feedbackEnabled) {
          return;
        }
        setSettingsOpen(false);
        setActiveRoute(route);
      }
    };
    window.addEventListener("metrio-navigate-route", onRoute);
    return () => window.removeEventListener("metrio-navigate-route", onRoute);
  }, [
    feedbackEnabled,
    performanceNavEnabled,
    setActiveRoute,
    setSettingsOpen,
  ]);

  useEffect(() => {
    const onSettings = (event: Event) => {
      const section = (event as CustomEvent<{ section?: SettingsSection }>).detail
        ?.section;
      if (section) {
        setSettingsSection(section);
      }
      setSettingsOpen(true);
    };
    const onNotifications = () => setNotificationsOpen(true);
    window.addEventListener("metrio-open-settings", onSettings);
    window.addEventListener("metrio-open-notifications", onNotifications);
    return () => {
      window.removeEventListener("metrio-open-settings", onSettings);
      window.removeEventListener("metrio-open-notifications", onNotifications);
    };
  }, [setSettingsOpen, setSettingsSection]);

  useEffect(() => {
    if (!feedbackEnabled && activeRoute === "feedback") {
      setActiveRoute("home");
    }
  }, [feedbackEnabled, activeRoute, setActiveRoute]);

  const showPerformanceToolbar =
    paintedRoute === "performance" &&
    !settingsOpen &&
    performanceToolbarCapable;

  const onRefresh = useCallback(() => {
    if (performanceDataEnabled || homeActive) {
      void refresh();
    }
  }, [performanceDataEnabled, homeActive, refresh]);

  const onNavigate = useCallback(
    (route: AppRoute) => {
      if (
        !performanceNavEnabled &&
        (route === "performance" || route === "feedback")
      ) {
        return;
      }
      setSettingsOpen(false);
      setActiveRoute(route);
    },
    [performanceNavEnabled, setActiveRoute, setSettingsOpen],
  );

  const onOpenSettings = useCallback(
    (section: SettingsSection = "preferences") => {
      setSettingsSection(section);
      setSettingsOpen(true);
    },
    [setSettingsOpen, setSettingsSection],
  );

  const commandPaletteHandlers = useMemo(
    () => ({
      refresh: onRefresh,
      openNotifications: () => setNotificationsOpen(true),
      openSettings: () => onOpenSettings("preferences"),
      openPerson: (personId: string) => {
        openPerson(personId);
      },
      openProjectCockpit: (projectKey: string) => {
        openProjectCockpit(projectKey);
      },
      switchTheme: () => {
        const order = ["system", "light", "dark"] as const;
        const next = order[(order.indexOf(preference) + 1) % order.length];
        setPreference(next);
      },
      feedbackEnabled,
      resolveJiraUrl: (issueKey: string) =>
        buildJiraIssueBrowseUrl(paletteJiraBaseUrl, issueKey),
      prepareNextOneOnOne: () => {
        const next = readCalendarCache()?.oneOnOnes[0];
        if (next?.otherPersonId) {
          openPerson(next.otherPersonId, "overview", {
            view: "brief",
            prepForOneOnOne: true,
            periodPreset: "30d",
          });
          return;
        }
        setActiveRoute("home");
      },
      openTodayMeetings: () => {
        setActiveRoute("home");
      },
    }),
    [
      onRefresh,
      onOpenSettings,
      preference,
      setPreference,
      feedbackEnabled,
      paletteJiraBaseUrl,
      setActiveRoute,
      openPerson,
    ],
  );

  const teamPersons = data?.teamSnapshot?.persons ?? [];
  const headerPerson =
    teamPersons.find((person) => person.id === currentUser.person.id) ?? null;

  const onLogout = useCallback(() => {
    void clearTrayUserContext();
    clearNotificationHistory();
    logoutSession();
    invalidateSession();
  }, [invalidateSession]);

  const onReconnect = useCallback(async () => {
    await clearConnection();
    resetConnection();
    setSettingsOpen(false);
  }, [resetConnection, setSettingsOpen]);

  const pageToolbar = useMemo(() => {
    if (!showPerformanceToolbar) {
      return null;
    }
    return (
      <PerformanceToolbar
        audience={showEmployeePerformance ? "employee" : "team"}
        dateRange={dateRange}
        reviewTarget={reviewTarget}
        controlsDisabled={
          performanceDataEnabled ? performanceControlsDisabled : false
        }
        refreshing={
          performanceDataEnabled ? performanceControlsDisabled : false
        }
        onDateRangeChange={setDateRange}
        onReviewTargetChange={setReviewTarget}
        onRefresh={onRefresh}
        onExportPdf={
          performanceDataEnabled
            ? () => {
                void performanceExport.exportCurrentView();
              }
            : undefined
        }
        exportDisabled={!performanceExport.canExport}
        exportBusy={performanceExport.exporting}
      />
    );
  }, [
    showPerformanceToolbar,
    showEmployeePerformance,
    dateRange,
    reviewTarget,
    performanceDataEnabled,
    performanceControlsDisabled,
    onRefresh,
    performanceExport.canExport,
    performanceExport.exporting,
    performanceExport.exportCurrentView,
    setDateRange,
  ]);

  const mainContent = settingsOpen ? (
    <SettingsPage
      initialSection={settingsSection}
      onReconnect={() => void onReconnect()}
    />
  ) : (
    <div className="app-route-stack" data-testid="app-route-stack">
      {paintedRoute === "home" ? (
        <div className="app-route-layer" data-testid="route-layer-home">
          <MemoHomePage />
        </div>
      ) : null}
      {paintedRoute === "performance" ? (
        <div className="app-route-layer" data-testid="route-layer-performance">
          <MemoPerformancePage reviewTarget={reviewTarget} />
        </div>
      ) : null}
      {paintedRoute === "feedback" ? <MemoFeedbackPage /> : null}
    </div>
  );

  const teamBriefPersonsById = useMemo(() => {
    const rows = viewModels?.teamOverview?.workload;
    const getPerson = viewModels?.getPerson;
    if (!rows?.length || !getPerson) return undefined;
    const map = new Map<string, Person>();
    for (const row of rows) {
      const person = getPerson(row.personId);
      if (person) map.set(row.personId, person);
    }
    return map.size > 0 ? map : undefined;
  }, [viewModels]);

  return (
    <>
      <TrayMenuEffects onRefresh={() => void refresh()} />
      <TraySummarySyncEffects />
      <UpdateTrayEffects onOpenAbout={openAboutSettings} />
      <AppShell
        header={
          <MetrioAppHeader
            activeRoute={settingsOpen ? null : activeRoute}
            feedbackVisible={feedbackEnabled}
            feedbackEnabled={feedbackEnabled && performanceNavEnabled}
            performanceEnabled={performanceNavEnabled}
            onNavigate={onNavigate}
            onOpenSettings={() => onOpenSettings("preferences")}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            notificationUnreadCount={notificationUnread}
            onOpenConnections={() => onOpenSettings("connections")}
            onLogout={onLogout}
            headerPerson={headerPerson}
          />
        }
        pageToolbar={pageToolbar}
      >
        <ScrollArea className="metrio-scroll--primary">{mainContent}</ScrollArea>
      </AppShell>
      <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onUnreadChange={setNotificationUnread}
        orgFeatureAccess={orgFeatureAccess}
        onOpenPerson={(personId) => {
          openPerson(personId);
        }}
        onOpenSettings={onOpenSettings}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        handlers={commandPaletteHandlers}
        searchInput={{
          currentUser,
          teamPersons,
          workGraph,
          feedbackEnabled,
          surveyManagementEnabled: orgFeatureAccess.canViewSurveyManagement,
        }}
      />
      <ProjectCockpitDrawer
        projectKey={projectCockpitKey}
        open={projectCockpitKey != null}
        onClose={() => setProjectCockpitKey(null)}
        dateRange={dateRange}
      />
      <DigestDrawer
        digest={
          (digestKind === "weekly"
            ? digestModel?.weekly
            : digestModel?.daily) as OperationalDigest | null
        }
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
        teamWorkload={viewModels?.teamOverview?.workload ?? []}
        personsById={teamBriefPersonsById}
      />
    </>
  );
}
