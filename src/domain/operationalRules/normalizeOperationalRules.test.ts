import { describe, expect, it } from "vitest";
import { DEFAULT_OPERATIONAL_RULES } from "./operationalRulesDefaults";
import { normalizeOperationalRules } from "./normalizeOperationalRules";

describe("normalizeOperationalRules", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeOperationalRules(null)).toEqual(DEFAULT_OPERATIONAL_RULES);
  });

  it("clamps invalid review days", () => {
    const rules = normalizeOperationalRules({
      taskAttention: { reviewAttentionDays: -1, noActivityDays: 99 },
    });
    expect(rules.taskAttention.reviewAttentionDays).toBe(1);
    expect(rules.taskAttention.noActivityDays).toBe(30);
  });

  it("falls back milestones when corrupt", () => {
    const rules = normalizeOperationalRules({
      vacation: { reminderMilestones: [99, 2] as unknown as (7 | 3 | 1 | 0)[] },
    });
    expect(rules.vacation.reminderMilestones).toEqual([7, 3, 1, 0]);
  });
});
