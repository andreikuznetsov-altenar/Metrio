import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  classifyPhotoProbeFailure,
  probeBambooEmployeePhoto,
} from "./bambooPhotoProbe";
import { isEmployeePhotoPermissionBlocked, clearEmployeeAvatarCacheForTests } from "./bambooAvatarService";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

describe("bambooPhotoProbe", () => {
  beforeEach(() => {
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
});
