import { useCallback, useState } from "react";
import { useCurrentUser } from "../app/CurrentUserContext";
import {
  isManagerRole,
  type DateRangeKey,
  type EmployeeReviewTargetKey,
  type PerformanceReviewTarget,
  type ReviewTargetKey,
} from "../domain/performance";
import { canOpenPersonDetail } from "../domain/personAccess";
import { EmployeePerformanceOverview } from "./performance/EmployeePerformanceOverview";
import { PersonDetailDrawer } from "./performance/PersonDetailDrawer";
import { TeamPerformanceOverview } from "./performance/TeamPerformanceOverview";

export interface PerformancePageProps {
  dateRange: DateRangeKey;
  reviewTarget: PerformanceReviewTarget;
  refreshToken: number;
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

export function PerformancePage({
  dateRange,
  reviewTarget,
  refreshToken,
}: PerformancePageProps) {
  const { currentUser } = useCurrentUser();
  const [personDetailId, setPersonDetailId] = useState<string | null>(null);
  const canViewTeamDashboard =
    isManagerRole(currentUser.person.role) && currentUser.team;

  const openPersonDetail = useCallback(
    (personId: string) => {
      if (canOpenPersonDetail(currentUser, personId)) {
        setPersonDetailId(personId);
      }
    },
    [currentUser],
  );

  const closePersonDetail = useCallback(() => {
    setPersonDetailId(null);
  }, []);

  const drawerOpen =
    personDetailId != null &&
    canOpenPersonDetail(currentUser, personDetailId);

  let content;

  if (currentUser.person.role === "employee") {
    content = (
      <EmployeePerformanceOverview
        personId={currentUser.person.id}
        dateRange={dateRange}
        reviewTarget={asEmployeeReviewTarget(reviewTarget)}
        refreshToken={refreshToken}
        onOpenPerson={openPersonDetail}
      />
    );
  } else if (!canViewTeamDashboard) {
    content = (
      <EmployeePerformanceOverview
        personId={currentUser.person.id}
        dateRange={dateRange}
        reviewTarget={asEmployeeReviewTarget(reviewTarget)}
        refreshToken={refreshToken}
        onOpenPerson={openPersonDetail}
      />
    );
  } else {
    content = (
      <TeamPerformanceOverview
        directReportIds={currentUser.team!.directReportIds}
        dateRange={dateRange}
        reviewTarget={asTeamReviewTarget(reviewTarget)}
        refreshToken={refreshToken}
        onOpenPerson={openPersonDetail}
      />
    );
  }

  return (
    <>
      {content}
      {drawerOpen && personDetailId ? (
        <PersonDetailDrawer
          personId={personDetailId}
          open={drawerOpen}
          onClose={closePersonDetail}
        />
      ) : null}
    </>
  );
}
