import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  classifyPhotoProbeFailure,
  probeBambooEmployeePhoto,
} from "./bambooPhotoProbe";
import {
  isEmployeePhotoPermissionBlocked,
  clearEmployeeAvatarCacheForTests,
  resetAvatarSession,
} from "./bambooAvatarService";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

describe("bambooPhotoProbe", () => {
  beforeEach(() => {
    resetAvatarSession();
    clearEmployeeAvatarCacheForTests();
    vi.mocked(invoke).mockReset();
  });

  it("classifies missing employee id as A", () => {
    expect(classifyPhotoProbeFailure("skipped", undefined, false)).toBe("A");
  });

  it("classifies 403 as E", () => {
    expect(classifyPhotoProbeFailure("forbidden", 403)).toBe("E");
  });

  it("records permission block on 403 probe", async () => {
    vi.mocked(invoke).mockRejectedValueOnce({ status: 403, message: "denied" });
    const result = await probeBambooEmployeePhoto("42", "altenar", "Daria");
    expect(result.outcome).toBe("forbidden");
    expect(result.httpStatus).toBe(403);
    expect(isEmployeePhotoPermissionBlocked()).toBe(true);
  });

  it("returns ok metadata without logging payload", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      content_type: "image/jpeg",
      data_base64: "YQ==",
    });
    const result = await probeBambooEmployeePhoto("7", "altenar");
    expect(result.outcome).toBe("ok");
    expect(result.byteLength).toBe(1);
    expect(result.contentType).toBe("image/jpeg");
  });

  it("uses camelCase Tauri invoke args for bamboo_get_employee_photo", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      content_type: "image/jpeg",
      data_base64: "YQ==",
    });
    await probeBambooEmployeePhoto("emp-99", "altenar", "Daria");
    expect(invoke).toHaveBeenCalledWith("bamboo_get_employee_photo", {
      config: { subdomain: "altenar" },
      employeeId: "emp-99",
      photoSize: "small",
    });
    const callArgs = vi.mocked(invoke).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty("employee_id");
    expect(callArgs).not.toHaveProperty("photo_size");
  });

  it("classifies invoke failure without HTTP status as native client error", async () => {
    resetAvatarSession();
    vi.mocked(invoke).mockRejectedValueOnce({
      message: "invalid args",
      code: "unknown",
    });
    const result = await probeBambooEmployeePhoto("42", "altenar");
    expect(result.outcome).toBe("failed");
    expect(result.httpStatus).toBeUndefined();
    expect(result.failureClass).toBe("D");
    expect(result.detail).toBe("invalid args");
    expect(isEmployeePhotoPermissionBlocked()).toBe(false);
  });
});
