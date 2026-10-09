import { getBuildBambooPortalUrl } from "./product";

export interface BuildBambooGoalUrlInput {
  /** Bamboo internal employee id that owns the goal */
  employeeId: string;
  /**
   * Optional goal id. Bamboo's verified web Goals surface is the employee
   * Performance → Goals page (`/performance/{employeeId}/goals`); the public
   * FE does not expose a stable per-goal deep link. When Bamboo returns an
   * absolute goal URL on a payload, pass it as `goalUrl` instead.
   */
  goalId?: string;
  /** Absolute URL returned by Bamboo when present — preferred over constructed routes */
  goalUrl?: string | null;
  /** Portal origin override (tests); defaults to product Bamboo portal URL */
  portalBaseUrl?: string;
}

/**
 * Canonical BambooHR Goals URL for an employee.
 *
 * Verified against Altenar tenant + Bamboo FE bundles:
 * - SPA route: `/performance/:userId/(assessments|feedback|goals)`
 * - Home deep links use `/performance/${employeeId}/assessments|feedback`
 * - Home "View My Goals" also uses legacy
 *   `/employees/performance/index.php?id=…&page=…&subpage=1`
 *
 * Prefer the modern SPA Goals route (same family as assessments/feedback).
 * Do not invent undocumented `…/goals/{goalId}` patterns.
 */
export function buildBambooGoalUrl(input: BuildBambooGoalUrlInput): string {
  const fromApi = String(input.goalUrl || "").trim();
  if (/^https?:\/\//i.test(fromApi)) {
    return fromApi;
  }

  const employeeId = String(input.employeeId || "").trim();
  if (!employeeId) {
    throw new Error("buildBambooGoalUrl requires employeeId");
  }

  const base = String(
    input.portalBaseUrl || getBuildBambooPortalUrl() || "",
  )
    .trim()
    .replace(/\/+$/, "");
  if (!base) {
    throw new Error("buildBambooGoalUrl requires a Bamboo portal base URL");
  }

  // goalId is accepted for call-site clarity / future API URLs; the verified
  // web surface is the employee's Goals tab (no stable public goal deep link).
  void input.goalId;

  return `${base}/performance/${encodeURIComponent(employeeId)}/goals`;
}
