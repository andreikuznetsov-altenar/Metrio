import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { registerCoalescedBackgroundRefresh } from "./backgroundRefresh";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (_event: string, handler: () => void) => {
    handlers.push(handler);
    return () => {
      handlers = handlers.filter((item) => item !== handler);
    };
  }),
}));

let handlers: Array<() => void> = [];

describe("registerCoalescedBackgroundRefresh", () => {
  beforeEach(() => {
    handlers = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid background events into one refresh", async () => {
    const refresh = vi.fn(async () => undefined);
    await registerCoalescedBackgroundRefresh(refresh);
    expect(handlers.length).toBe(4);
    handlers[0]?.();
    handlers[1]?.();
    handlers[2]?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("debounces system-resumed handler", async () => {
    const refresh = vi.fn(async () => undefined);
    await registerCoalescedBackgroundRefresh(refresh);
    handlers[3]?.();
    handlers[3]?.();
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
