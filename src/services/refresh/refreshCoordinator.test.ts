import { describe, expect, it } from "vitest";
import { createCoalescedRefresh } from "./refreshCoordinator";

describe("createCoalescedRefresh", () => {
  it("serializes overlapping refresh calls", async () => {
    let active = 0;
    let maxActive = 0;
    const refresh = createCoalescedRefresh(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    });

    await Promise.all([refresh(), refresh(), refresh()]);
    expect(maxActive).toBe(1);
  });

  it("replays one pending refresh after the active run completes", async () => {
    let count = 0;
    let release: (() => void) | undefined;
    const refresh = createCoalescedRefresh(async () => {
      count += 1;
      if (count === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
    });

    const first = refresh();
    void refresh();
    release?.();
    await first;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(count).toBe(2);
  });
});
