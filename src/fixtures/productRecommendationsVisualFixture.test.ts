import { afterEach, describe, expect, it } from "vitest";
import {
  VISUAL_PRODUCT_RECOMMENDATIONS_STORAGE_KEY,
  readVisualProductRecommendationsOverride,
} from "./productRecommendationsVisualFixture";

afterEach(() => localStorage.clear());

describe("legacy recommendation-card visual seam", () => {
  it("is inert outside VITE_VISUAL_FIXTURE builds, even if the storage key is present", () => {
    // Production / presentation / documentation builds never set VITE_VISUAL_FIXTURE.
    expect(import.meta.env.VITE_VISUAL_FIXTURE).not.toBe("1");
    localStorage.setItem(VISUAL_PRODUCT_RECOMMENDATIONS_STORAGE_KEY, JSON.stringify([{ id: "x", title: "Injected" }]));
    expect(readVisualProductRecommendationsOverride()).toBeNull();
  });
});
