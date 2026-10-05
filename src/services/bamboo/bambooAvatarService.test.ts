import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearEmployeeAvatarCacheForTests,
  fetchEmployeeAvatarDataUrl,
  peekAvatarCacheStatus,
  peekCachedEmployeeAvatar,
  resetAvatarSession,
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
    resetAvatarSession();
    clearEmployeeAvatarCacheForTests();
    vi.mocked(invoke).mockClear();
  });

  it("dedupes concurrent fetches for the same employee", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => fetchEmployeeAvatarDataUrl("7", "acme")),
    );
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(new Set(results).size).toBe(1);
  });

  it("caches successful avatar fetch", async () => {
    const first = await fetchEmployeeAvatarDataUrl("7", "acme", "small");
    const second = await fetchEmployeeAvatarDataUrl("7", "acme", "small");
    expect(first).toContain("data:image/jpeg;base64,abc");
    expect(second).toBe(first);
    expect(invoke).toHaveBeenCalledTimes(1);
    const args = {
      config: { subdomain: "acme" },
      employeeId: "7",
      photoSize: "small",
    };
    expect(invoke).toHaveBeenCalledWith("bamboo_get_employee_photo", args);
    expect(args).not.toHaveProperty("employee_id");
    expect(args).not.toHaveProperty("photo_size");
  });

  it("uses camelCase Tauri invoke args for bamboo_get_employee_photo", async () => {
    await fetchEmployeeAvatarDataUrl("emp-42", "altenar", "small");
    expect(invoke).toHaveBeenCalledWith("bamboo_get_employee_photo", {
      config: { subdomain: "altenar" },
      employeeId: "emp-42",
      photoSize: "small",
    });
    const callArgs = vi.mocked(invoke).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs).toBeDefined();
    expect(callArgs).not.toHaveProperty("employee_id");
    expect(callArgs).not.toHaveProperty("photo_size");
  });

  it("uses separate cache keys per photo size", async () => {
    await fetchEmployeeAvatarDataUrl("7", "acme", "small");
    await fetchEmployeeAvatarDataUrl("7", "acme", "medium");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("falls back to null after failed fetch and records status", async () => {
    vi.mocked(invoke).mockRejectedValueOnce({
      message: "not found",
      code: "bamboo_api_error",
      status: 404,
    });
    const result = await fetchEmployeeAvatarDataUrl("8", "acme");
    expect(result).toBeNull();
    expect(peekCachedEmployeeAvatar("8", "acme")).toBeNull();
    expect(peekAvatarCacheStatus("8", "acme")).toBe("missing");
  });

  it("records forbidden status on 403", async () => {
    vi.mocked(invoke).mockRejectedValueOnce({
      message: "forbidden",
      code: "bamboo_api_error",
      status: 403,
    });
    await fetchEmployeeAvatarDataUrl("9", "acme");
    expect(peekAvatarCacheStatus("9", "acme")).toBe("forbidden");
  });

  it("sets session permission hint after forbidden response", async () => {
    const { isEmployeePhotoPermissionBlocked, getEmployeePhotoPermissionHint } =
      await import("./bambooAvatarService");
    vi.mocked(invoke).mockRejectedValueOnce({
      message: "forbidden",
      code: "bamboo_api_error",
      status: 403,
    });
    await fetchEmployeeAvatarDataUrl("11", "acme");
    expect(isEmployeePhotoPermissionBlocked()).toBe(true);
    expect(getEmployeePhotoPermissionHint()).toMatch(/permissions/i);
  });

  it("allows retry after transient 5xx TTL expires", async () => {
    vi.useFakeTimers();
    vi.mocked(invoke).mockRejectedValueOnce({
      message: "server error",
      code: "bamboo_api_error",
      status: 503,
    });
    await fetchEmployeeAvatarDataUrl("10", "acme");
    expect(peekAvatarCacheStatus("10", "acme")).toBe("failed");
    vi.mocked(invoke).mockResolvedValueOnce({
      content_type: "image/jpeg",
      data_base64: "xyz",
    });
    await vi.advanceTimersByTimeAsync(31_000);
    const retry = await fetchEmployeeAvatarDataUrl("10", "acme");
    expect(retry).toContain("data:image/jpeg");
    expect(invoke).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
