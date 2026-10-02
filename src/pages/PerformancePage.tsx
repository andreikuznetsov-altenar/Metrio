import { useCallback, useEffect, useState } from "react";
import { usePerformanceData } from "../app/PerformanceDataContext";
import { useCurrentUser } from "../app/CurrentUserContext";
import {
  isManagerRole,
  type EmployeeReviewTargetKey,
  type PerformanceReviewTarget,
  type ReviewTargetKey,
} from "../domain/performance";
import { canOpenPersonDetail } from "../domain/personAccess";
import { EmployeePerformanceOverview } from "./performance/EmployeePerformanceOverview";
import { PersonDetailDrawer } from "./performance/PersonDetailDrawer";
import { TeamPerformanceOverview } from "./performance/TeamPerformanceOverview";
import { PerformanceContentShell } from "./performance/PerformanceContentShell";

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

export function PerformancePage({ reviewTarget }: PerformancePageProps) {
  const { currentUser } = useCurrentUser();
  const { performanceControlsDisabled } = usePerformanceData();
  const [personDetailId, setPersonDetailId] = useState<string | null>(null);
  const [personDrawerOpen, setPersonDrawerOpen] = useState(false);
  const canViewTeamDashboard =
    isManagerRole(currentUser.person.role) && currentUser.team;

  void asTeamReviewTarget(reviewTarget);
  void asEmployeeReviewTarget(reviewTarget);

  const openPersonDetail = useCallback(
    (personId: string) => {
      if (performanceControlsDisabled) return;
      if (canOpenPersonDetail(currentUser, personId)) {
        setPersonDetailId(personId);
        setPersonDrawerOpen(true);
      }
    },
    [currentUser, performanceControlsDisabled],
  );

  const closePersonDetail = useCallback(() => {
    setPersonDrawerOpen(false);
  }, []);

  const clearPersonDetail = useCallback(() => {
    setPersonDetailId(null);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const personId = (event as CustomEvent<string>).detail;
      if (typeof personId === "string" && personId) {
        openPersonDetail(personId);
      }
    };
    window.addEventListener("metrio-open-person", handler);
    return () => window.removeEventListener("metrio-open-person", handler);
  }, [openPersonDetail]);

  let content;

  if (currentUser.person.role === "employee") {
    content = (
      <EmployeePerformanceOverview
        personId={currentUser.person.id}
        onOpenPerson={openPersonDetail}
      />
    );
  } else if (!canViewTeamDashboard) {
    content = (
      <EmployeePerformanceOverview
        personId={currentUser.person.id}
        onOpenPerson={openPersonDetail}
      />
    );
  } else {
    content = (
      <TeamPerformanceOverview
        onOpenPerson={openPersonDetail}
        reviewTarget={asTeamReviewTarget(reviewTarget)}
      />
    );
  }

  return (
    <>
      <PerformanceContentShell>{content}</PerformanceContentShell>
      {personDetailId ? (
        <PersonDetailDrawer
          personId={personDetailId}
          open={personDrawerOpen}
          onClose={closePersonDetail}
          onClosed={clearPersonDetail}
        />
      ) : null}
    </>
  );
}
