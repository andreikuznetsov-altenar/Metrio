import { describe, expect, it } from "vitest";
import {
  availabilityBadgeVariant,
  workloadBadgeVariantFromLabel,
} from "./performanceStatusBadges";

describe("performanceStatusBadges", () => {
  it("maps Available to success", () => {
    expect(availabilityBadgeVariant("Available")).toBe("success");
  });

  it("maps workload labels consistently", () => {
    expect(workloadBadgeVariantFromLabel("Overloaded")).toBe("danger");
    expect(workloadBadgeVariantFromLabel("Heavy")).toBe("warning");
    expect(workloadBadgeVariantFromLabel("Light")).toBe("success");
    expect(workloadBadgeVariantFromLabel("Balanced")).toBe("neutral");
  });
});
