import { describe, expect, it } from "vitest";
import type { DeliveryRiskRow } from "../performance";
import {
  buildTraySummaryFromPerformance,
  scopeHealthForTray,
} from "./buildTraySummaryFromPerformance";

function managerTrayInput(options: {
  throughput: string;
  deliveryRiskCount: number;
  overloadedCount?: number;
  problemRows?: DeliveryRiskRow[];
  openActiveWork?: number;
}) {
  const deliveryRisk: DeliveryRiskRow[] =
    options.problemRows ??
    Array.from({ length: options.deliveryRiskCount }, (_, index) => ({
      issueKey: `UX-${index + 1}`,
      title: `Issue ${index + 1}`,
      ownerId: "p1",
      ownerName: "Owner",
      status: "Review",
      age: "3 days",
      riskReason: "Long review",
    }));

  const overloaded = options.overloadedCount ?? 1;
  const workloadRows = Array.from({ length: Math.max(overloaded, 1) }, (_, index) => ({
    personId: `p${index + 1}`,
    activeWork: options.openActiveWork ?? 0,
    atRisk: 0,
    workload: index < overloaded ? "Overloaded" : "Moderate",
    availability: "Available",
    capacityDataState: "measured" as const,
  }));

  const input = {
    homeRole: "manager" as const,
    teamSnapshot: {
      summary: [
        {
          label: "Throughput",
          value: options.throughput,
        },
      ],
      workload: workloadRows,
    },
    deliveryRisk,
    scopeHealthEvidence: {
      role: "manager" as const,
      focusCount: 0,
      deliveryRiskCount: options.deliveryRiskCount,
      teamWorkload: workloadRows,
    },
  };

  return input;
}

describe("tray Throughput", () => {
  it("uses Throughput even when scopeHealth line is delivery-risk prose", () => {
    const input = managerTrayInput({ throughput: "31", deliveryRiskCount: 44 });
    const scopeHealth = scopeHealthForTray(input);
    expect(scopeHealth.line).toMatch(/44 delivery risks/i);

    const model = buildTraySummaryFromPerformance(input, 0);
    expect(model.indexValue).toBe("31");
    expect(model.indexLabel).toBe("Throughput");
  });

  it("delivery risk count change does not change Throughput", () => {
    const stable = managerTrayInput({ throughput: "31", deliveryRiskCount: 44 });
    const fewerRisks = managerTrayInput({ throughput: "31", deliveryRiskCount: 12 });

    expect(buildTraySummaryFromPerformance(stable, 0).indexValue).toBe("31");
    expect(buildTraySummaryFromPerformance(fewerRisks, 0).indexValue).toBe("31");
    expect(buildTraySummaryFromPerformance(fewerRisks, 0).problemTaskCount).toBe(12);
  });

  it("tracks Throughput when it changes", () => {
    const before = managerTrayInput({ throughput: "31", deliveryRiskCount: 44 });
    const after = managerTrayInput({ throughput: "27", deliveryRiskCount: 44 });

    expect(buildTraySummaryFromPerformance(before, 0).indexValue).toBe("31");
    expect(buildTraySummaryFromPerformance(after, 0).indexValue).toBe("27");
  });

  it("problem tasks and open tasks stay independent of Throughput", () => {
    const input = managerTrayInput({
      throughput: "31",
      deliveryRiskCount: 44,
      openActiveWork: 7,
    });
    const model = buildTraySummaryFromPerformance(input, 0);
    expect(model.problemTaskCount).toBe(44);
    expect(model.openTaskCount).toBe(7);
    expect(model.indexValue).toBe("31");
  });

  it("scopeHealth prose is never emitted as Throughput", () => {
    const input = managerTrayInput({ throughput: "31", deliveryRiskCount: 44 });
    const scopeHealth = scopeHealthForTray(input);
    const model = buildTraySummaryFromPerformance(input, 0);
    expect(model.indexValue).not.toMatch(/delivery risk/i);
    expect(model.indexValue).not.toBe(scopeHealth.line.split("·")[0]?.trim());
  });

  it("falls back to em dash when Throughput is unavailable", () => {
    const model = buildTraySummaryFromPerformance(
      {
        homeRole: "manager",
        teamSnapshot: { summary: [{ label: "First pass", value: "80%" }], workload: [] },
        deliveryRisk: [],
        scopeHealthEvidence: {
          role: "manager",
          focusCount: 0,
          deliveryRiskCount: 0,
          teamWorkload: [],
        },
      },
      0,
    );
    expect(model.indexValue).toBe("—");
  });
});

describe("tray throughput parity", () => {
  it("uses numeric throughput for employee tray instead of scope prose", () => {
    const model = buildTraySummaryFromPerformance(
      {
        homeRole: "employee",
        teamSnapshot: {
          summary: [
            {
              label: "Throughput",
              value: "8",
            },
          ],
          workload: [],
        },
        employeeActiveSummaryValue: "0",
        deliveryRisk: [],
        scopeHealthEvidence: {
          role: "employee",
          focusCount: 0,
          deliveryRiskCount: 0,
          selfWorkload: "Light",
        },
      },
      0,
    );

    expect(model.indexLabel).toBe("Throughput");
    expect(model.indexValue).toBe("8");
    expect(model.indexValue).not.toMatch(/scope|healthy|risk|attention/i);
  });

  it("uses the same numeric throughput source for director tray", () => {
    const model = buildTraySummaryFromPerformance(
      {
        homeRole: "director",
        teamSnapshot: {
          summary: [
            {
              label: "Throughput",
              value: "93",
            },
          ],
          workload: [],
        },
        deliveryRisk: [],
        scopeHealthEvidence: {
          role: "director",
          focusCount: 0,
          deliveryRiskCount: 0,
          teamWorkload: [],
          organizationSignalCount: 0,
        },
      },
      0,
    );

    expect(model.indexValue).toBe("93");
    expect(model.indexValue).not.toMatch(/scope|healthy|signal|risk/i);
  });
});

describe("tray person Throughput", () => {
  const baseEvidence = {
    role: "employee" as const,
    focusCount: 0,
    deliveryRiskCount: 0,
    selfWorkload: "Light" as const,
  };

  it("uses the person-level Throughput metric for employee scope", () => {
    const model = buildTraySummaryFromPerformance(
      {
        homeRole: "employee",
        teamSnapshot: null,
        employeeMetrics: [
          { label: "Throughput", value: "12" },
        ],
        deliveryRisk: [],
        scopeHealthEvidence: baseEvidence,
      } as never,
      0,
    );

    expect(model.indexLabel).toBe("Throughput");
    expect(model.indexValue).toBe("12");
    expect(model.indexValue).toMatch(/^\d+(?:\.\d+)?$/);
  });

  it("never renders prose as an index value", () => {
    const model = buildTraySummaryFromPerformance(
      {
        homeRole: "employee",
        teamSnapshot: null,
        employeeMetrics: [
          { label: "Throughput", value: "Your scope looks healthy" },
        ],
        deliveryRisk: [],
        scopeHealthEvidence: baseEvidence,
      } as never,
      0,
    );

    expect(model.indexValue).toBe("—");
  });
});
