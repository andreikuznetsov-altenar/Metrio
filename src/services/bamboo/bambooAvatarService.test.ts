import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearEmployeeAvatarCacheForTests,
  fetchEmployeeAvatarDataUrl,
  peekCachedEmployeeAvatar,
} from "./bambooAvatarService";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => ({
    content_type: "image/jpeg",
    data_base64: "abc",
  })),
}));

import { invoke } from "@tauri-apps/api/core";

describe("bambooAvatarService", () => {
  beforeEach(() => {
    clearEmployeeAvatarCacheForTests();
    vi.mocked(invoke).mockClear();
  });

  it("caches successful avatar fetch", async () => {
    const first = await fetchEmployeeAvatarDataUrl("7", "acme");
    const second = await fetchEmployeeAvatarDataUrl("7", "acme");
    expect(first).toContain("data:image/jpeg;base64,abc");
    expect(second).toBe(first);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("falls back to null after failed fetch", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("restricted"));
    const result = await fetchEmployeeAvatarDataUrl("8", "acme");
    expect(result).toBeNull();
    expect(peekCachedEmployeeAvatar("8", "acme")).toBeNull();
  });
});
