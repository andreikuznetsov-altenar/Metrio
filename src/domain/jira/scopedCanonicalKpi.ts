import type { Person } from "../people/types";
import type { WorkflowProfileMapping } from "../workflows/types";
import { collectUniqueTeamIssues } from "./uniqueIssues";
import { buildKpiFromIssues } from "./kpi";
import type { AuditIssue, KpiData, ReportParams } from "./types";

export type BuildCanonicalKpiForPersonScopeInput = {
  /** People in the authorized organizational subset (team / branch / MoM subtree). */
  persons: Person[];
  /** Same report params as Performance / team KPI (period, targetReviewDays, …). */
  params: ReportParams;
  /** Optional workflow profile overrides (tests / custom matrices). */
  mappings?: WorkflowProfileMapping[];
  /**
   * Optional explicit issue set. When omitted, uses each person's historically
   * attributed `issues` (not `ownedIssues` / current assignee), then dedupes by
   * issueKey — same semantics as team KPI flatten.
   */
  issues?: AuditIssue[];
};

/**
 * Canonical performance outcomes for an arbitrary people scope.
 *
 * Authority: `buildKpiFromIssues` → `buildWorkflowKpi` (completion / first-pass /
 * execution / review time / rework). Sums primitive numerators and denominators;
 * it never averages person-level rates or invents a second formula.
 */
export function buildCanonicalKpiForPersonScope(
  input: BuildCanonicalKpiForPersonScopeInput,
): KpiData {
  const seenPerson = new Set<string>();
  const uniquePersons = input.persons.filter((person) => {
    if (seenPerson.has(person.id)) return false;
    seenPerson.add(person.id);
    return true;
  });

  const issues =
    input.issues ?? collectUniqueTeamIssues(uniquePersons);

  const contributorCanonicals = new Set(
    uniquePersons
      .map((person) => person.jira?.canonicalKey)
      .filter((key): key is string => Boolean(key)),
  );
  return buildKpiFromIssues(
    issues,
    {},
    input.params,
    contributorCanonicals.size > 0 ? { contributorCanonicals } : {},
  );
}
