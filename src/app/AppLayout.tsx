import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell/AppShell";
import { bootLog } from "./bootDiagnostics";
import { ScrollArea } from "../components/ScrollArea/ScrollArea";
import type { PerformanceReviewTarget } from "../domain/performance";
import {
  readSessionPerformanceDateRange,
  writeSessionPerformanceDateRange,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import { isManagerRole } from "../domain/performance";
import type { AppRoute } from "../domain/types";
import { isFeedbackEnabled } from "./featureGates";
import { FeedbackPage } from "../pages/FeedbackPage";
import { PerformancePage } from "../pages/PerformancePage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import type { SettingsSection } from "../pages/settings/types";
import { MetrioAppHeader } from "../shell/MetrioAppHeader";
import { PageToolbar } from "../shell/PageToolbar";
import { PerformanceToolbar } from "../shell/PerformanceToolbar";
import { NotificationCenter } from "../shell/NotificationCenter";
import { countUnreadNotificationEvents, NOTIFICATION_EVENTS_CHANGED } from "../platform/notificationEvents";
import { RuntimeShellEffects } from "./RuntimeShellEffects";
import { useCurrentUser } from "./CurrentUserContext";
import { clearConnection } from "./connectionStorage";
import { useConnectionGate } from "./ConnectionContext";
import { logoutSession } from "./logoutSession";
import {
  PerformanceDataProvider,
  usePerformanceData,
} from "./PerformanceDataContext";
import {
  PerformanceExportProvider,
  usePerformanceExport,
} from "./PerformanceExportContext";

function toolbarCopy(route: AppRoute) {
  if (route === "performance") {
    return {
      title: "Performance",
      subtitle: "Individual performance overview",
    };
  }

  return {
    title: "Feedback",
    subtitle: "Surveys and team responses",
  };
}

function defaultReviewTarget(role: string): PerformanceReviewTarget {
  return role === "employee" ? "personal" : "team";
}

export function AppLayout() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>("performance");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("general");
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
    setReviewTarget(defaultReviewTarget(currentUser.person.role));
  }, [currentUser.person.id, currentUser.person.role]);

  const performanceAudience: "team" | "employee" =
    isManagerRole(currentUser.person.role) && currentUser.team ? "team" : "employee";

  const showTeamPerformanceToolbar =
    isManagerRole(currentUser.person.role) && Boolean(currentUser.team);

  const performanceSurfaceActive = activeRoute === "performance" && !settingsOpen;

  return (
    <>
      <RuntimeShellEffects />
      <PerformanceDataProvider
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
          performanceDataEnabled={activeRoute === "performance" && !settingsOpen}
          showTeamPerformance={
            activeRoute === "performance" &&
            !settingsOpen &&
            showTeamPerformanceToolbar
          }
          showEmployeePerformance={
            activeRoute === "performance" &&
            !settingsOpen &&
            currentUser.person.role === "employee"
          }
        />
        </PerformanceExportProvider>
      </PerformanceDataProvider>
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
  showTeamPerformance: boolean;
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
  showTeamPerformance,
  showEmployeePerformance,
}: AppLayoutShellProps) {
  const feedbackEnabled = isFeedbackEnabled();
  const { resetConnection, invalidateSession } = useConnectionGate();
  const { refresh, performanceControlsDisabled } = usePerformanceData();
  const performanceExport = usePerformanceExport();
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
    const onRoute = (event: Event) => {
      const route = (event as CustomEvent<AppRoute>).detail;
      if (route === "performance" || route === "feedback") {
        setSettingsOpen(false);
        setActiveRoute(route);
      }
    };
    window.addEventListener("metrio-navigate-route", onRoute);
    return () => window.removeEventListener("metrio-navigate-route", onRoute);
  }, [setActiveRoute, setSettingsOpen]);

  useEffect(() => {
    if (!feedbackEnabled && activeRoute === "feedback") {
      setActiveRoute("performance");
    }
  }, [feedbackEnabled, activeRoute, setActiveRoute]);

  const showPerformanceToolbar =
    showTeamPerformance || showEmployeePerformance;

  const onRefresh = useCallback(() => {
    if (performanceDataEnabled) {
      void refresh();
    }
  }, [performanceDataEnabled, refresh]);

  const onNavigate = useCallback(
    (route: AppRoute) => {
      setSettingsOpen(false);
      setActiveRoute(route);
    },
    [setActiveRoute, setSettingsOpen],
  );

  const onOpenSettings = useCallback(
    (section: SettingsSection = "general") => {
      setSettingsSection(section);
      setSettingsOpen(true);
    },
    [setSettingsOpen, setSettingsSection],
  );

  const onLogout = useCallback(() => {
    logoutSession();
    invalidateSession();
  }, [invalidateSession]);

  const onReconnect = useCallback(async () => {
    await clearConnection();
    resetConnection();
    setSettingsOpen(false);
  }, [resetConnection, setSettingsOpen]);

  const feedbackToolbar = useMemo(() => toolbarCopy("feedback"), []);

  const pageToolbar = useMemo(() => {
    if (settingsOpen) {
      return (
        <PageToolbar title="Settings" subtitle="Preferences and integrations" />
      );
    }
    if (showPerformanceToolbar) {
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
    }
    if (activeRoute === "performance") {
      const copy = toolbarCopy("performance");
      return <PageToolbar title={copy.title} subtitle={copy.subtitle} />;
    }
    return (
      <PageToolbar
        title={feedbackToolbar.title}
        subtitle={feedbackToolbar.subtitle}
      />
    );
  }, [
    settingsOpen,
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
    activeRoute,
    feedbackToolbar,
    setDateRange,
  ]);

  const mainContent = settingsOpen ? (
    <SettingsPage
      initialSection={settingsSection}
      onReconnect={() => void onReconnect()}
    />
  ) : activeRoute === "performance" ? (
    <PerformancePage reviewTarget={reviewTarget} />
  ) : (
    <FeedbackPage />
  );

  return (
    <>
      <AppShell
        header={
          <MetrioAppHeader
            activeRoute={settingsOpen ? null : activeRoute}
            feedbackEnabled={feedbackEnabled}
            onNavigate={onNavigate}
            onOpenSettings={() => onOpenSettings("general")}
            onOpenNotifications={() => setNotificationsOpen(true)}
            notificationUnreadCount={notificationUnread}
            onOpenConnections={() => onOpenSettings("connections")}
            onLogout={onLogout}
          />
        }
        pageToolbar={pageToolbar}
      >
        <ScrollArea>{mainContent}</ScrollArea>
      </AppShell>
      <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onUnreadChange={setNotificationUnread}
        onOpenPerson={(personId) => {
          window.dispatchEvent(
            new CustomEvent("metrio-open-person", { detail: personId }),
          );
        }}
        onOpenSettings={onOpenSettings}
      />
    </>
  );
}
