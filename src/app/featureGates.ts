const PERFORMANCE_APPROVED_KEY = "metrio-performance-approved";

/**
 * Feedback is available only after the Performance experience is signed off.
 * Missing key defaults to approved in Phase 9+ builds.
 */
export function isPerformanceApproved(): boolean {
  const stored = localStorage.getItem(PERFORMANCE_APPROVED_KEY);
  if (stored === null) {
    return true;
  }
  return stored === "true";
}

export function setPerformanceApproved(approved: boolean): void {
  if (approved) {
    localStorage.setItem(PERFORMANCE_APPROVED_KEY, "true");
  } else {
    localStorage.setItem(PERFORMANCE_APPROVED_KEY, "false");
  }
}

export function isFeedbackEnabled(features?: { feedback?: boolean }): boolean {
  if (features && features.feedback === false) return false;
  return isPerformanceApproved();
}

export function isGoalsEnabled(features?: { goals?: boolean }): boolean {
  return features?.goals !== false;
}

export function isProjectCockpitEnabled(features?: { projectCockpit?: boolean }): boolean {
  return features?.projectCockpit !== false;
}
