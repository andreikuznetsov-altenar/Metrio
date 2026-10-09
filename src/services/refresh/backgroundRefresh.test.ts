import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { registerCoalescedBackgroundRefresh } from "./backgroundRefresh";
import { PERFORMANCE_BACKGROUND_INTERVAL_MS } from "./performanceRefreshCadence";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: () => void) => {
    listened.push({ event, handler });
    return () => {
      listened = listened.filter((item) => item.handler !== handler);
    };
  }),
}));

let listened: Array<{ event: string; handler: () => void }> = [];

function handlersFor(event: string): Array<() => void> {
  return listened.filter((item) => item.event === event).map((item) => item.handler);
}

describe("registerCoalescedBackgroundRefresh", () => {
  beforeEach(() => {
    listened = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("subscribes only to app-refresh + system-resumed (not jira/bamboo full refresh)", async () => {
    const refresh = vi.fn(async () => undefined);
    await registerCoalescedBackgroundRefresh(refresh);
    const events = listened.map((item) => item.event).sort();
    expect(events).toEqual(["background-app-refresh", "system-resumed"]);
  });

  it("G. overlapping scheduler ticks coalesce into one refresh", async () => {
    const refresh = vi.fn(async () => undefined);
    await registerCoalescedBackgroundRefresh(refresh);
    const app = handlersFor("background-app-refresh")[0]!;
    app();
    app();
    app();
    await Promise.resolve();
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("E. resume <15m does not refresh", async () => {
    const refresh = vi.fn(async () => undefined);
    await registerCoalescedBackgroundRefresh({
      refresh,
      shouldRefreshOnResume: () => false,
    });
    handlersFor("system-resumed")[0]?.();
    await vi.advanceTimersByTimeAsync(1500);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("F. resume >=15m refreshes once after debounce", async () => {
    const refresh = vi.fn(async () => undefined);
    await registerCoalescedBackgroundRefresh({
      refresh,
      shouldRefreshOnResume: () => true,
    });
    const resume = handlersFor("system-resumed")[0]!;
    resume();
    resume();
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("resume gate uses 15-minute cadence constant", () => {
    expect(PERFORMANCE_BACKGROUND_INTERVAL_MS).toBe(15 * 60 * 1000);
  });
});
