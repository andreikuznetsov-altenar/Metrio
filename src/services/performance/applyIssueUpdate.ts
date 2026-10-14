import {
  applyVerifiedIssueState,
  mapIssueByKey,
  type VerifiedIssueState,
} from "../../domain/jira/applyVerifiedIssueState";
import type { AuditReportData } from "../../domain/jira/types";
import { filterOwnedIssues } from "../../domain/people/ownedIssues";
import type { Person, TeamSnapshot } from "../../domain/people/types";
import { calculateWorkload } from "../../domain/workload/workloadEngine";
import { summarizeTeam } from "../people/personService";
import type { PerformanceFetchResult } from "./performanceTypes";

function patchReport(report: AuditReportData, verified: VerifiedIssueState): AuditReportData {
  const grouped: AuditReportData["grouped"] = {};
  for (const [key, block] of Object.entries(report.grouped)) {
    grouped[key] = {
      ...block,
      issues: mapIssueByKey(block.issues, verified.issueKey, (i) => applyVerifiedIssueState(i, verified)),
    };
  }
  return { ...report, grouped };
}

function patchSnapshot(
  snapshot: TeamSnapshot,
  report: AuditReportData,
  verified: VerifiedIssueState,
): TeamSnapshot {
  const persons: Person[] = snapshot.persons.map((person) => {
    if (!person.issues.some((i) => i.issueKey === verified.issueKey)) return person;
    const issues = mapIssueByKey(person.issues, verified.issueKey, (i) =>
      applyVerifiedIssueState(i, verified),
    );
    const canonicalKey = person.jira?.canonicalKey || person.bamboo.workEmail || person.id;
    const ownedIssues = filterOwnedIssues(issues, canonicalKey);
    const personalWorkload = calculateWorkload(
      ownedIssues,
      report.params,
      undefined,
      person.availability,
    );
    return { ...person, issues, ownedIssues, personalWorkload, workload: personalWorkload };
  });
  return { ...snapshot, persons, summary: summarizeTeam(persons, report.params) };
}

/**
 * Pure local reconciliation after Jira CONFIRMED a transition and the issue was re-read:
 * every copy of the issue gets Jira's verified status, and the per-person workload and team
 * summary are recomputed from it. The caller rebuilds the view models from the result.
 */
export function applyVerifiedIssueUpdate(
  data: PerformanceFetchResult,
  verified: VerifiedIssueState,
): PerformanceFetchResult {
  const reportData = patchReport(data.reportData, verified);
  const historyReportData = patchReport(data.historyReportData, verified);
  return {
    ...data,
    reportData,
    historyReportData,
    teamSnapshot: patchSnapshot(data.teamSnapshot, reportData, verified),
    historyTeamSnapshot: patchSnapshot(data.historyTeamSnapshot, historyReportData, verified),
  };
}
