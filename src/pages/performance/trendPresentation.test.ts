import { describe, expect, it } from "vitest";
import type { TrendComparison } from "../../domain/trends/trendEngine";
import {
  buildTrendCardData,
  metricContextFromComparison,
  movementDirectionFromDelta,
  trendComparisonCaption,
  trendSemanticFromComparison,
} from "./trendPresentation";

function comparison(
  overrides: Partial<TrendComparison> & { absoluteDelta: number },
): TrendComparison {
  return {
    current: 10,
    previous: 8,
    absoluteDelta: overrides.absoluteDelta,
    percentagePointDelta: overrides.percentagePointDelta ?? null,
    direction: overrides.direction ?? "up",
    label: overrides.label ?? "+2",
    sufficient: overrides.sufficient ?? true,
    sufficiencyMessage: null,
    unknown: false,
    ...overrides,
  };
}

describe("trendPresentation", () => {
  it("uses numeric delta for arrow and favorable direction for color", () => {
    const avgCycleUp = buildTrendCardData(
      "Avg cycle",
      comparison({
        absoluteDelta: 1.8,
        direction: "down",
        label: "+1.8 days",
      }),
    );
    expect(avgCycleUp.trendMovementDirection).toBe("up");
    expect(avgCycleUp.trendSemantic).toBe("negative");

    const avgCycleDown = buildTrendCardData(
      "Avg cycle",
      comparison({
        absoluteDelta: -1.2,
        direction: "up",
        label: "-1.2 days",
      }),
    );
    expect(avgCycleDown.trendMovementDirection).toBe("down");
    expect(avgCycleDown.trendSemantic).toBe("positive");
  });

  it("maps completed increase as up arrow and positive semantic", () => {
    const card = buildTrendCardData(
      "Completed",
      comparison({ absoluteDelta: 2, direction: "up", label: "+2" }),
    );
    expect(card.trendMovementDirection).toBe("up");
    expect(trendSemanticFromComparison(comparison({ absoluteDelta: 2, direction: "up" }))).toBe(
      "positive",
    );
  });

  it("maps first pass decrease as down arrow and negative semantic", () => {
    const card = buildTrendCardData(
      "First pass",
      comparison({
        absoluteDelta: -28.6,
        direction: "down",
        label: "-28.6 pp",
      }),
    );
    expect(card.trendMovementDirection).toBe("down");
    expect(
      trendSemanticFromComparison(
        comparison({ absoluteDelta: -28.6, direction: "down" }),
      ),
    ).toBe("negative");
  });

  it("maps backflow increase as up arrow and negative semantic", () => {
    const card = buildTrendCardData(
      "Backflows",
      comparison({ absoluteDelta: 3, direction: "down", label: "+3" }),
    );
    expect(card.trendMovementDirection).toBe("up");
    expect(card.trendSemantic).toBe("negative");
  });

  it("derives movement direction from absolute delta only", () => {
    expect(movementDirectionFromDelta(0)).toBe("flat");
    expect(movementDirectionFromDelta(3)).toBe("up");
    expect(movementDirectionFromDelta(-2)).toBe("down");
  });

  it("adds comparison caption for metric cards", () => {
    expect(metricContextFromComparison(comparison({ absoluteDelta: 2 }), "30d")).toEqual({
      contextLabel: "+2",
      contextSemantic: "positive",
      contextCaption: "vs previous 30 days",
    });
    expect(trendComparisonCaption("quarter")).toBe("vs previous quarter");
  });
});
