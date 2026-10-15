import { afterEach, describe, expect, it, vi } from "vitest";
import { DOC_FIXTURE_NOW_ISO, appNow, isAppClockFixed, setAppClock, setAppClockFixed } from "./appClock";
import { resetDocFixtureModeCacheForTests } from "./docFixtures";

afterEach(() => {
  setAppClock(null);
  resetDocFixtureModeCacheForTests();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("app clock", () => {
  it("PRODUCTION: with no fixture clock it is the real current time (follows system time)", () => {
    expect(isAppClockFixed()).toBe(false);
    const realBefore = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-05-06T07:08:09.000Z"));
    expect(appNow().toISOString()).toBe("2031-05-06T07:08:09.000Z");
    vi.setSystemTime(new Date("2031-05-07T07:08:09.000Z"));
    expect(appNow().toISOString()).toBe("2031-05-07T07:08:09.000Z");
    vi.useRealTimers();
    expect(Math.abs(appNow().getTime() - realBefore)).toBeLessThan(60_000);
  });

  it("FIXTURE: a pinned clock never drifts, whatever the system time", () => {
    vi.useFakeTimers();
    setAppClockFixed("2026-10-14T09:30:00.000Z");
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    expect(appNow().toISOString()).toBe("2026-10-14T09:30:00.000Z");
    vi.setSystemTime(new Date("2031-12-31T23:59:59.000Z"));
    expect(appNow().toISOString()).toBe("2026-10-14T09:30:00.000Z");
  });

  it("returns a fresh Date each call (callers cannot mutate the pinned instant)", () => {
    setAppClockFixed("2026-10-14T09:30:00.000Z");
    const a = appNow();
    a.setFullYear(1999);
    expect(appNow().toISOString()).toBe("2026-10-14T09:30:00.000Z");
  });

  it("an injected source (test clock) wins and can be removed", () => {
    setAppClock(() => new Date("2026-01-02T03:04:05.000Z"));
    expect(appNow().toISOString()).toBe("2026-01-02T03:04:05.000Z");
    setAppClock(null);
    expect(isAppClockFixed()).toBe(false);
  });

  it("documentation fixture mode pins the clock to its dataset's today; no fixture mode leaves real time", async () => {
    const invoke = vi.fn(async () => ({ enabled: true, role: "lead" }));
    vi.doMock("@tauri-apps/api/core", () => ({ invoke }));
    vi.resetModules();
    const clock = await import("./appClock");
    const docs = await import("./docFixtures");
    clock.setAppClock(null);
    await docs.getDocFixtureMode();
    expect(clock.isAppClockFixed()).toBe(true);
    expect(clock.appNow().toISOString()).toBe(DOC_FIXTURE_NOW_ISO);

    invoke.mockResolvedValue({ enabled: false, role: "lead" });
    vi.resetModules();
    const clock2 = await import("./appClock");
    const docs2 = await import("./docFixtures");
    await docs2.getDocFixtureMode();
    expect(clock2.isAppClockFixed()).toBe(false);
    vi.doUnmock("@tauri-apps/api/core");
  });
});
