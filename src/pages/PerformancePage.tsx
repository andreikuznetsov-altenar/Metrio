import { useCallback, useEffect } from "react";
import { usePerformanceData } from "../app/PerformanceDataContext";
import { useCurrentUser } from "../app/CurrentUserContext";
import {
  PerformanceAnalyticsProvider,
  PERSON_DRAWER_CLOSE_EVENT,
  usePerformanceAnalytics,
  type PersonDrawerTab,
} from "../app/performanceAnalyticsContext";
import {
  isDirectorRole,
  isManagerRole,
  type EmployeeReviewTargetKey,
  type PerformanceReviewTarget,
  type ReviewTargetKey,
} from "../domain/performance";
import { canOpenPersonDetail } from "../domain/personAccess";
import { EmployeePerformanceOverview } from "./performance/EmployeePerformanceOverview";
import { PersonDetailDrawer } from "./performance/PersonDetailDrawer";
import { TeamPerformanceOverview } from "./performance/TeamPerformanceOverview";
import { DirectorPerformanceOverview } from "./performance/director/DirectorPerformanceOverview";
import { PerformanceContentShell } from "./performance/PerformanceContentShell";
import { AnalyticsDrilldownDrawer } from "./performance/AnalyticsDrilldownDrawer";

export interface PerformancePageProps {
  reviewTarget: PerformanceReviewTarget;
}

function asTeamReviewTarget(
  value: PerformanceReviewTarget,
): ReviewTargetKey {
  if (value === "team" || value === "sprint" || value === "org") {
    return value;
  }
  return "team";
}

function asEmployeeReviewTarget(
  value: PerformanceReviewTarget,
): EmployeeReviewTargetKey {
  if (value === "personal" || value === "quarter") {
    return value;
  }
  return "sprint";
}

function PerformancePageBody({ reviewTarget }: PerformancePageProps) {
  const { currentUser } = useCurrentUser();
  const { performanceControlsDisabled } = usePerformanceData();
  const {
    personId,
    personTab,
    personDrawerOpen,
    openPersonDrawer,
    closePersonDrawer,
    clearPersonDrawer,
    drilldownOpen,
    drilldownEvidence,
    closeDrilldown,
    returnFocusRef,
  } = usePerformanceAnalytics();
  const canViewTeamDashboard =
    isManagerRole(currentUser.person.role) && currentUser.team;

  void asTeamReviewTarget(reviewTarget);
  void asEmployeeReviewTarget(reviewTarget);

  const handleOpenPerson = useCallback(
    (nextPersonId: string, tab?: PersonDrawerTab) => {
      if (performanceControlsDisabled) return;
      openPersonDrawer({ personId: nextPersonId, tab });
    },
    [openPersonDrawer, performanceControlsDisabled],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string | { personId: string; tab?: PersonDrawerTab }>)
        .detail;
      if (typeof detail === "string" && detail) {
        openPersonDrawer({ personId: detail });
        return;
      }
      if (detail && typeof detail === "object" && detail.personId) {
        openPersonDrawer({ personId: detail.personId, tab: detail.tab });
      }
    };
    window.addEventListener("metrio-open-person", handler);
    return () => window.removeEventListener("metrio-open-person", handler);
  }, [openPersonDrawer]);

  useEffect(() => {
    const onClosePerson = () => {
      closePersonDrawer();
      clearPersonDrawer();
    };
    window.addEventListener(PERSON_DRAWER_CLOSE_EVENT, onClosePerson);
    return () => window.removeEventListener(PERSON_DRAWER_CLOSE_EVENT, onClosePerson);
  }, [closePersonDrawer, clearPersonDrawer]);

  let content;

  if (currentUser.person.role === "employee") {
    content = <EmployeePerformanceOverview personId={currentUser.person.id} />;
  } else if (!canViewTeamDashboard) {
    content = <EmployeePerformanceOverview personId={currentUser.person.id} />;
  } else if (isDirectorRole(currentUser.person.role)) {
    content = <DirectorPerformanceOverview onOpenPerson={handleOpenPerson} />;
  } else {
    content = (
      <TeamPerformanceOverview
        onOpenPerson={handleOpenPerson}
        reviewTarget={asTeamReviewTarget(reviewTarget)}
      />
    );
  }

  return (
    <>
      <PerformanceContentShell>{content}</PerformanceContentShell>
      {personId ? (
        <PersonDetailDrawer
          personId={personId}
          open={personDrawerOpen}
          activeTab={personTab}
          onTabChange={(tab) => openPersonDrawer({ personId, tab })}
          onClose={closePersonDrawer}
          onClosed={clearPersonDrawer}
        />
      ) : null}
      <AnalyticsDrilldownDrawer
        open={drilldownOpen}
        evidence={drilldownEvidence}
        onClose={closeDrilldown}
        onOpenPerson={handleOpenPerson}
        returnFocusRef={returnFocusRef}
      />
    </>
  );
}

export function PerformancePage({ reviewTarget }: PerformancePageProps) {
  const { currentUser } = useCurrentUser();
  const { performanceControlsDisabled } = usePerformanceData();

  const canOpenPerson = useCallback(
    (personId: string) => {
      if (performanceControlsDisabled) return false;
      return canOpenPersonDetail(currentUser, personId);
    },
    [currentUser, performanceControlsDisabled],
  );

  const canViewTeamDashboard =
    isManagerRole(currentUser.person.role) && Boolean(currentUser.team);

  return (
    <PerformanceAnalyticsProvider
      reviewTarget={reviewTarget}
      canOpenPerson={canOpenPerson}
      allowTeamAnalytics={canViewTeamDashboard}
    >
      <PerformancePageBody reviewTarget={reviewTarget} />
    </PerformanceAnalyticsProvider>
  );
}
