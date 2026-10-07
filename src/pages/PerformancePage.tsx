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
  type EmployeeReviewTargetKey,
  type PerformanceReviewTarget,
  type ReviewTargetKey,
} from "../domain/performance";
import { resolveOrgCapabilities } from "../domain/organization/orgCapabilities";
import { PerformanceRoleRouter } from "./performance/PerformanceRoleRouter";
import { canOpenPersonDetail } from "../domain/personAccess";
import { EmployeePerformanceOverview } from "./performance/EmployeePerformanceOverview";
import { PersonDetailDrawer } from "./performance/PersonDetailDrawer";
import { TeamPerformanceOverview } from "./performance/TeamPerformanceOverview";
import { DirectorPerformanceOverview } from "./performance/director/DirectorPerformanceOverview";
import { PerformanceContentShell } from "./performance/PerformanceContentShell";
import { AnalyticsDrilldownDrawer } from "./performance/AnalyticsDrilldownDrawer";
import { usePersonNavigation } from "../app/PersonNavigationContext";

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
  const { registerPersonDrawerHandler } = usePersonNavigation();
  const capabilities = resolveOrgCapabilities(currentUser.orgRole);
  const performanceVariant =
    capabilities.performanceVariant === "direct_team" && !currentUser.team
      ? "self"
      : capabilities.performanceVariant;
  const canViewTeamDashboard = performanceVariant !== "self";

  void asTeamReviewTarget(reviewTarget);
  void asEmployeeReviewTarget(reviewTarget);

  const handleOpenPerson = useCallback(
    (nextPersonId: string, tab?: PersonDrawerTab) => {
      if (performanceControlsDisabled) return;
      openPersonDrawer({ personId: nextPersonId, tab });
    },
    [openPersonDrawer, performanceControlsDisabled],
  );

  useEffect(
    () => registerPersonDrawerHandler(handleOpenPerson),
    [handleOpenPerson, registerPersonDrawerHandler],
  );

  useEffect(() => {
    const onClosePerson = () => {
      closePersonDrawer();
      clearPersonDrawer();
    };
    window.addEventListener(PERSON_DRAWER_CLOSE_EVENT, onClosePerson);
    return () => window.removeEventListener(PERSON_DRAWER_CLOSE_EVENT, onClosePerson);
  }, [closePersonDrawer, clearPersonDrawer]);

  const content = (
    <PerformanceRoleRouter
      variant={performanceVariant}
      self={<EmployeePerformanceOverview personId={currentUser.person.id} />}
      directTeam={
        canViewTeamDashboard ? (
          <TeamPerformanceOverview
            onOpenPerson={handleOpenPerson}
            reviewTarget={asTeamReviewTarget(reviewTarget)}
          />
        ) : (
          <EmployeePerformanceOverview personId={currentUser.person.id} />
        )
      }
      leadershipBranches={
        <DirectorPerformanceOverview onOpenPerson={handleOpenPerson} />
      }
      fallback={<EmployeePerformanceOverview personId={currentUser.person.id} />}
    />
  );

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

  const capabilities = resolveOrgCapabilities(currentUser.orgRole);
  const performanceVariant =
    capabilities.performanceVariant === "direct_team" && !currentUser.team
      ? "self"
      : capabilities.performanceVariant;
  const canViewTeamDashboard = performanceVariant !== "self";

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
