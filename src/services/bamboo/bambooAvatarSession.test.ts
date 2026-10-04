import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearEmployeeAvatarCacheForTests,
  fetchEmployeeAvatarDataUrl,
  peekCachedEmployeeAvatar,
  resetAvatarSession,
} from "./bambooAvatarService";
import { registerPersonDirectory, lookupPersonDirectory } from "../../domain/people/personDirectory";
import type { Person } from "../../domain/people/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => ({
    content_type: "image/jpeg",
    data_base64: "abc",
  })),
}));

function person(): Person {
  return {
    id: "p1",
    bamboo: {
      id: "b1",
      displayName: "Test",
      firstName: "T",
      lastName: "E",
      workEmail: "t@test",
      jobTitle: "Role",
      status: "Active",
    },
    jira: null,
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: null,
    performance: null,
    issues: [],
    ownedIssues: [],
  };
}

describe("resetAvatarSession", () => {
  beforeEach(() => {
    clearEmployeeAvatarCacheForTests();
    registerPersonDirectory([person()]);
  });

  it("clears avatar cache and person directory on logout reset", async () => {
    await fetchEmployeeAvatarDataUrl("b1", "acme");
    expect(peekCachedEmployeeAvatar("b1", "acme")).toBeTruthy();
    expect(lookupPersonDirectory("p1")).toBeDefined();

    resetAvatarSession();

    expect(peekCachedEmployeeAvatar("b1", "acme")).toBeUndefined();
    expect(lookupPersonDirectory("p1")).toBeUndefined();
  });
});
