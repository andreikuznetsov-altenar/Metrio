import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { capacityLevelFromPercent } from "../workflows/capacityWorkload";
import { isActiveWorkloadStatus } from "../workflows/workloadStatusClassification";
import type { AuditIssue } from "../jira/types";

const CODE_GS = join(process.cwd(), "docs/canonical-legacy/apps-script/Code.gs");

describe("Canonical workload parity matrix (Code.gs)", () => {
  it("documents Apps Script load thresholds vs Metrio mapping", () => {
    const source = readFileSync(CODE_GS, "utf8");
    expect(source).toContain("function getLoadStatus_");
    expect(source).toContain("if (value > 100) return 'Overloaded'");
    expect(source).toContain("if (value >= 50) return 'Normal'");

    expect(capacityLevelFromPercent(110)).toBe("overloaded");
    expect(capacityLevelFromPercent(55)).toBe("normal");
    expect(capacityLevelFromPercent(40)).toBe("low");
  });

  it("excludes In Review from active workload contributor segments", () => {
    const inReview: AuditIssue = {
      issueKey: "AGTC-105",
      issueSummary: "Review task",
      issueCreated: "2026-01-01T10:00:00.000Z",
      assigneeName: "Andrei",
      issueTypeName: "Task",
      contentType: "none",
      designImprovementType: "",
      epicKey: "",
      epicSummary: "",
      epicStatus: "",
      epicContentType: "",
      epicDesignImprovementType: "",
      currentStatus: "In Review",
      events: [],
      rangeEvents: [],
    };
    expect(isActiveWorkloadStatus(inReview)).toBe(false);
  });
});
