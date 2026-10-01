import { describe, expect, it } from "vitest";
import { logoutSession } from "./logoutSession";
import {
  clearSessionMarker,
  isAppConnected,
  markSessionConnected,
} from "./connectionStorage";

describe("logoutSession", () => {
  it("clears session marker without removing connection config key", () => {
    markSessionConnected();
    localStorage.setItem("metrio-connection-config", JSON.stringify({ workEmail: "a@co.com" }));
    logoutSession();
    expect(isAppConnected()).toBe(false);
    expect(localStorage.getItem("metrio-connection-config")).toBeTruthy();
    clearSessionMarker();
    localStorage.removeItem("metrio-connection-config");
  });
});
