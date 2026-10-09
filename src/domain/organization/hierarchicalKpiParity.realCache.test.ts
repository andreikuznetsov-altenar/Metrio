/**
 * Real packaged dashboard-cache parity: scoped canonical KPI === teamKpi.
 * Enable with METRIO_HIER_KPI_QA=1 (reads com.altenar.metrio dashboard_cache).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildCanonicalKpiForPersonScope } from "../jira/scopedCanonicalKpi";
import { getEfficiencyScoreBreakdown } from "../jira/kpi";
import { collectUniqueTeamIssues } from "../jira/uniqueIssues";
import type { Person } from "../people/types";
import type { ReportParams } from "../jira/types";

const runReal = process.env.METRIO_HIER_KPI_QA === "1";
const CACHE_PATH = join(
  homedir(),
  "Library/Application Support/com.altenar.metrio/dashboard_cache.json",
);

describe.skipIf(!runReal)("PASS 15.2 real dashboard-cache hierarchical KPI", () => {
  it("leaf-manager team scope matches canonical calculator and cached teamKpi", () => {
    expect(existsSync(CACHE_PATH)).toBe(true);
    const cache = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as {
      fetchResult: {
        teamSnapshot: { persons: Person[] };
        reportData: { teamKpi: Record<string, number>; params: ReportParams };
      };
    };
    const persons = cache.fetchResult.teamSnapshot.persons;
    const params = cache.fetchResult.reportData.params;
    const teamKpi = cache.fetchResult.reportData.teamKpi;

    const scoped = buildCanonicalKpiForPersonScope({ persons, params });
    expect(scoped.efficiencyIndex).toBe(teamKpi.efficiencyIndex);
    expect(scoped.completedCount).toBe(teamKpi.completedCount);
    expect(scoped.backflowCount).toBe(teamKpi.backflowCount);
    expect(scoped.firstPassAcceptedCount).toBe(teamKpi.firstPassAcceptedCount);

    const speed = getEfficiencyScoreBreakdown({
      ...scoped,
      targetReviewDays: params.targetReviewDays,
    });
    const projects = [
      ...new Set(
        collectUniqueTeamIssues(persons)
          .map((i) => i.projectKey)
          .filter(Boolean),
      ),
    ];

    // eslint-disable-next-line no-console
    console.log(
      "PASS15.2 real leaf-manager KPI",
      JSON.stringify(
        {
          people: persons.map((p) => ({
            id: p.id,
            name: p.bamboo?.displayName,
          })),
          projects,
          Efficiency: scoped.efficiencyIndex,
          FirstPass: Math.round(
            (scoped.firstPassAcceptedCount / Math.max(scoped.completedCount, 1)) *
              100,
          ),
          Completed: scoped.completedCount,
          Backflows: scoped.backflowCount,
          speedScore: speed.speedScore,
          equalsTeamKpi: true,
        },
        null,
        2,
      ),
    );
  });
});
