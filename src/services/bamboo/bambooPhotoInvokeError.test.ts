import { describe, expect, it } from "vitest";
import {
  avatarCacheStatusFromPhotoError,
  classifyBambooPhotoInvokeError,
} from "./bambooPhotoInvokeError";

describe("classifyBambooPhotoInvokeError", () => {
  it("maps HTTP 403 to forbidden without native classification", () => {
    const result = classifyBambooPhotoInvokeError({
      status: 403,
      message: "denied",
      code: "bamboo_api_error",
    });
    expect(result.kind).toBe("http_forbidden");
    expect(avatarCacheStatusFromPhotoError(result)).toBe("forbidden");
  });

  it("maps HTTP 404 to missing", () => {
    const result = classifyBambooPhotoInvokeError({
      status: 404,
      message: "not found",
      code: "bamboo_api_error",
    });
    expect(result.kind).toBe("http_not_found");
    expect(avatarCacheStatusFromPhotoError(result)).toBe("missing");
  });

  it("maps invoke contract failures to native_invoke", () => {
    const result = classifyBambooPhotoInvokeError({
      message: "invalid args employee_id",
      code: "unknown",
    });
    expect(result.kind).toBe("native_invoke");
    expect(result.httpStatus).toBeUndefined();
    expect(avatarCacheStatusFromPhotoError(result)).toBe("failed");
  });

  it("maps other HTTP codes to http_other", () => {
    const result = classifyBambooPhotoInvokeError({
      status: 503,
      message: "upstream",
      code: "bamboo_api_error",
    });
    expect(result.kind).toBe("http_other");
    expect(avatarCacheStatusFromPhotoError(result)).toBe("failed");
  });
});
