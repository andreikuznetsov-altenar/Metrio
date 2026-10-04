import { describe, expect, it } from "vitest";
import {
  compareSemanticStatus,
  rankAttentionSeverity,
  rankWorkloadLabel,
} from "./tableSemanticRank";

describe("tableSemanticRank", () => {
  it("orders attention severity critical before warning before neutral", () => {
    expect(rankAttentionSeverity("critical")).toBeLessThan(rankAttentionSeverity("warning"));
    expect(rankAttentionSeverity("warning")).toBeLessThan(rankAttentionSeverity("info"));
  });

  it("orders workload overloaded before heavy before balanced", () => {
    expect(rankWorkloadLabel("Overloaded")).toBeLessThan(rankWorkloadLabel("Heavy"));
    expect(rankWorkloadLabel("Heavy")).toBeLessThan(rankWorkloadLabel("Balanced"));
  });

  it("compareSemanticStatus supports workload kind", () => {
    expect(
      compareSemanticStatus("Overloaded", "Light", "workload"),
    ).toBeLessThan(0);
  });
});
