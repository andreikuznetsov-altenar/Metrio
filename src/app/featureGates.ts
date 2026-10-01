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

export function isFeedbackEnabled(): boolean {
  return isPerformanceApproved();
}
