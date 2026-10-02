import { describe, expect, it } from "vitest";
import type { AuditReportData } from "../jira/types";
import { testKpi } from "../testFixtures";
import {
  personIssuesFromReport,
  personKpiFromReport,
  resolvePersonReportKey,
} from "./personAnalyticsScope";
import type { Person } from "../people/types";

function personWithKey(id: string, canonical: string): Person {
  return {
    id,
    bamboo: {
      displayName: "Alex Morgan",
      workEmail: `${id}@example.com`,
      jobTitle: "Designer",
    },
    jira: { canonicalKey: canonical, accountId: canonical, displayName: "Alex" },
    availability: { state: "available", label: "Available" },
    issues: [],
    performance: testKpi({ completedCount: 3 }),
  };
}

describe("personAnalyticsScope", () => {
  it("resolves report key from jira canonical", () => {
    const person = personWithKey("p-1", "alex-canonical");
    expect(resolvePersonReportKey(person)).toBe("alex-canonical");
  });

  it("reads scoped issues and KPI from grouped report", () => {
    const report: AuditReportData = {
      params: {
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        targetReviewDays: 3,
        users: [],
        projects: [],
      },
      grouped: {
        "alex-canonical": {
          userLabel: "Alex Morgan",
          issues: [
            {
              issueKey: "UX-1",
              issueSummary: "One",
              issueCreated: "2026-01-01T00:00:00.000Z",
              assigneeName: "Alex",
              issueTypeName: "Task",
              contentType: "none",
              designImprovementType: "none",
              epicKey: "none",
              epicSummary: "none",
              epicStatus: "none",
              epicContentType: "none",
              epicDesignImprovementType: "none",
              currentStatus: "Done",
              events: [],
              rangeEvents: [],
            },
          ],
        },
      },
      teamKpi: testKpi(),
      perUserKpi: {
        "alex-canonical": testKpi({ completedCount: 1 }),
      },
    };

    expect(personIssuesFromReport(report, "alex-canonical")).toHaveLength(1);
    expect(personKpiFromReport(report, "alex-canonical")?.completedCount).toBe(1);
  });
});
