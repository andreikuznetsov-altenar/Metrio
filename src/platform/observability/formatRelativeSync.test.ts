import { afterEach, describe, expect, it, vi } from "vitest";
import { setAppClock, setAppClockFixed } from "../appClock";
import { formatRelativeSync } from "./connectionDiagnostics";

afterEach(() => {
  setAppClock(null);
  vi.useRealTimers();
});

describe("formatRelativeSync", () => {
  it("is relative to the application clock (a pinned clock never drifts with the real date)", () => {
    setAppClockFixed("2026-10-14T09:30:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00.000Z"));
    expect(formatRelativeSync("2026-10-14T09:00:00.000Z")).toBe("30 min ago");
    expect(formatRelativeSync("2026-10-13T05:30:00.000Z")).toBe("28 h ago");
  });
  it("production: follows the real clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T10:00:00.000Z"));
    expect(formatRelativeSync("2031-01-01T09:00:00.000Z")).toBe("60 min ago".replace("60 min", "1 h"));
  });
});
