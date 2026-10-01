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
import { MetrioAppHeader } from "../shell/MetrioAppHeader";
import { PageToolbar } from "../shell/PageToolbar";
import { PerformanceToolbar } from "../shell/PerformanceToolbar";
import { useCurrentUser } from "./CurrentUserContext";
import { clearConnection } from "./connectionStorage";
import { useConnectionGate } from "./ConnectionContext";

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
  const feedbackEnabled = isFeedbackEnabled();
  const { resetConnection } = useConnectionGate();
  const { currentUser } = useCurrentUser();
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [reviewTarget, setReviewTarget] = useState<PerformanceReviewTarget>(
    () => defaultReviewTarget(currentUser.person.role),
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    bootLog("17M", "AppLayout mounted");
  }, []);

  useEffect(() => {
    setReviewTarget(defaultReviewTarget(currentUser.person.role));
  }, [currentUser.person.id, currentUser.person.role]);

  useEffect(() => {
    if (!feedbackEnabled && activeRoute === "feedback") {
      setActiveRoute("performance");
    }
  }, [feedbackEnabled, activeRoute]);

  const isEmployee = currentUser.person.role === "employee";
  const showTeamPerformance =
    !settingsOpen &&
    activeRoute === "performance" &&
    isManagerRole(currentUser.person.role) &&
    Boolean(currentUser.team);
  const showEmployeePerformance =
    !settingsOpen && activeRoute === "performance" && isEmployee;
  const showPerformanceToolbar =
    showTeamPerformance || showEmployeePerformance;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshToken((value) => value + 1);
      setRefreshing(false);
    }, 500);
  }, []);

  const onNavigate = useCallback(
    (route: AppRoute) => {
      setSettingsOpen(false);
      setActiveRoute(route);
    },
    [],
  );

  const onOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const onReconnect = useCallback(async () => {
    await clearConnection();
    resetConnection();
    setSettingsOpen(false);
  }, [resetConnection]);

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
          refreshing={refreshing}
          onDateRangeChange={setDateRange}
          onReviewTargetChange={setReviewTarget}
          onRefresh={onRefresh}
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
    refreshing,
    onRefresh,
    activeRoute,
    feedbackToolbar,
  ]);

  const mainContent = settingsOpen ? (
    <SettingsPage onReconnect={() => void onReconnect()} />
  ) : activeRoute === "performance" ? (
    <PerformancePage
      dateRange={dateRange}
      reviewTarget={reviewTarget}
      refreshToken={refreshToken}
    />
  ) : (
    <FeedbackPage />
  );

  return (
    <AppShell
      header={
        <MetrioAppHeader
          activeRoute={settingsOpen ? activeRoute : activeRoute}
          feedbackEnabled={feedbackEnabled}
          onNavigate={onNavigate}
          onOpenSettings={onOpenSettings}
        />
      }
      pageToolbar={pageToolbar}
    >
      <ScrollArea>{mainContent}</ScrollArea>
    </AppShell>
  );
}
