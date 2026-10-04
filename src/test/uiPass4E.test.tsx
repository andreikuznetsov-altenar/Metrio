// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { notificationActionLabel } from "../platform/notificationActionLabel";

describe("UI pass 4E consistency", () => {
  it("labels home notification target as View Dashboard", () => {
    expect(
      notificationActionLabel({
        id: "1",
        type: "daily_brief_ready",
        title: "Brief",
        message: "Ready",
        createdAt: new Date().toISOString(),
        target: { kind: "home" },
      }),
    ).toBe("View Dashboard");
  });
});
