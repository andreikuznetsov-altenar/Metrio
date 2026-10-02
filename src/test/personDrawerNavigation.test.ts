import { describe, expect, it, vi } from "vitest";
import {
  dispatchOpenPersonDetail,
  type PersonDrawerTab,
} from "../app/performanceAnalyticsContext";

describe("person drawer navigation", () => {
  it("dispatches metrio-open-person with string detail", () => {
    const handler = vi.fn();
    window.addEventListener("metrio-open-person", handler);
    dispatchOpenPersonDetail("person-alex");
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toBe("person-alex");
    window.removeEventListener("metrio-open-person", handler);
  });

  it("dispatches metrio-open-person with tab detail", () => {
    const handler = vi.fn();
    window.addEventListener("metrio-open-person", handler);
    const detail = { personId: "person-alex", tab: "work" as PersonDrawerTab };
    dispatchOpenPersonDetail(detail);
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toEqual(detail);
    window.removeEventListener("metrio-open-person", handler);
  });
});
