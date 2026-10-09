import { describe, expect, it } from "vitest";
import type { DeliveryRiskRow } from "../performance";
import {
  buildTraySummaryFromPerformance,
  scopeHealthForTray,
} from "./buildTraySummaryFromPerformance";

function managerTrayInput(options: {
  efficiency: string;
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
          label: "Efficiency",
          value: options.efficiency,
          status: "Healthy",
          statusVariant: "success" as const,
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

describe("PASS 15.5H tray Team index", () => {
  it("A: uses Efficiency 91% even when scopeHealth line is delivery-risk prose", () => {
    const input = managerTrayInput({ efficiency: "91%", deliveryRiskCount: 44 });
    const scopeHealth = scopeHealthForTray(input);
    expect(scopeHealth.line).toMatch(/44 delivery risks/i);

    const model = buildTraySummaryFromPerformance(input, 0);
    expect(model.indexValue).toBe("91%");
    expect(model.indexLabel).toBe("Team index");
  });

  it("B: delivery risk count change does not change Team index when Efficiency is stable", () => {
    const stable = managerTrayInput({ efficiency: "91%", deliveryRiskCount: 44 });
    const fewerRisks = managerTrayInput({ efficiency: "91%", deliveryRiskCount: 12 });

    expect(buildTraySummaryFromPerformance(stable, 0).indexValue).toBe("91%");
    expect(buildTraySummaryFromPerformance(fewerRisks, 0).indexValue).toBe("91%");
    expect(buildTraySummaryFromPerformance(fewerRisks, 0).problemTaskCount).toBe(12);
  });

  it("C: Team index tracks Efficiency when it changes", () => {
    const before = managerTrayInput({ efficiency: "91%", deliveryRiskCount: 44 });
    const after = managerTrayInput({ efficiency: "87%", deliveryRiskCount: 44 });

    expect(buildTraySummaryFromPerformance(before, 0).indexValue).toBe("91%");
    expect(buildTraySummaryFromPerformance(after, 0).indexValue).toBe("87%");
  });

  it("D/E: problem tasks and open tasks stay independent of Efficiency", () => {
    const input = managerTrayInput({
      efficiency: "91%",
      deliveryRiskCount: 44,
      openActiveWork: 7,
    });
    const model = buildTraySummaryFromPerformance(input, 0);
    expect(model.problemTaskCount).toBe(44);
    expect(model.openTaskCount).toBe(7);
    expect(model.indexValue).toBe("91%");
  });

  it("F: scopeHealth prose is never emitted as manager Team index", () => {
    const input = managerTrayInput({ efficiency: "91%", deliveryRiskCount: 44 });
    const scopeHealth = scopeHealthForTray(input);
    const model = buildTraySummaryFromPerformance(input, 0);
    expect(model.indexValue).not.toMatch(/delivery risk/i);
    expect(model.indexValue).not.toBe(scopeHealth.line.split("·")[0]?.trim());
  });

  it("G: falls back to em dash when team summary Efficiency is unavailable", () => {
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
