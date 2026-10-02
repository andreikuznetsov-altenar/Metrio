import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell/AppShell";
import { bootLog } from "./bootDiagnostics";
import { ScrollArea } from "../components/ScrollArea/ScrollArea";
import type {
  DateRangeKey,
  PerformanceReviewTarget,
} from "../domain/performance";
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
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const { currentUser } = useCurrentUser();
  const [reviewTarget, setReviewTarget] = useState<PerformanceReviewTarget>(
    () => defaultReviewTarget(currentUser.person.role),
  );

  useEffect(() => {
    setReviewTarget(defaultReviewTarget(currentUser.person.role));
  }, [currentUser.person.id, currentUser.person.role]);

  const performanceDataEnabled =
    !settingsOpen && activeRoute === "performance";

  const isEmployee = currentUser.person.role === "employee";
  const showTeamPerformance =
    performanceDataEnabled &&
    isManagerRole(currentUser.person.role) &&
    Boolean(currentUser.team);

  return (
    <>
      <RuntimeShellEffects />
      <PerformanceDataProvider
        enabled={performanceDataEnabled}
        dateRange={dateRange}
        reviewTarget={reviewTarget}
        audience={showTeamPerformance ? "team" : "employee"}
        selfPersonId={currentUser.person.id}
        managerTeamTray={showTeamPerformance}
      >
        <PerformanceExportProvider
          audience={showTeamPerformance ? "team" : "employee"}
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
          performanceDataEnabled={performanceDataEnabled}
          showTeamPerformance={showTeamPerformance}
          showEmployeePerformance={performanceDataEnabled && isEmployee}
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
  dateRange: DateRangeKey;
  setDateRange: (value: DateRangeKey) => void;
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
  const { refresh, refreshing } = usePerformanceData();
  const performanceExport = usePerformanceExport();

  useEffect(() => {
    bootLog("17M", "AppLayout mounted");
  }, []);

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
          refreshing={performanceDataEnabled ? refreshing : false}
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
          exportStatusMessage={performanceExport.exportMessage}
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
    refreshing,
    onRefresh,
    performanceExport.canExport,
    performanceExport.exporting,
    performanceExport.exportMessage,
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
    <AppShell
      header={
        <MetrioAppHeader
          activeRoute={settingsOpen ? null : activeRoute}
          feedbackEnabled={feedbackEnabled}
          onNavigate={onNavigate}
          onOpenSettings={() => onOpenSettings("general")}
          onOpenNotifications={() => onOpenSettings("notifications")}
          onOpenConnections={() => onOpenSettings("connections")}
          onLogout={onLogout}
        />
      }
      pageToolbar={pageToolbar}
    >
      <ScrollArea>{mainContent}</ScrollArea>
    </AppShell>
  );
}
