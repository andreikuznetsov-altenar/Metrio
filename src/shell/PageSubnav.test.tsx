import { describe, expect, it } from "vitest";
import { measureSubnavIndicator } from "./PageSubnav";

describe("measureSubnavIndicator", () => {
  it("returns width and offset for active tab", () => {
    expect(measureSubnavIndicator(48, 72)).toEqual({ left: 48, width: 72 });
  });
});
