import { describe, expect, it } from "vitest";
import {
  badgeVariantForConnectionState,
  formatConnectionHealthLabel,
} from "./diagnosticsHealthPresentation";

describe("diagnosticsHealthPresentation", () => {
  it("humanizes machine connection states", () => {
    expect(formatConnectionHealthLabel("connected")).toBe("Connected");
    expect(formatConnectionHealthLabel("not_configured")).toBe("Not configured");
    expect(formatConnectionHealthLabel("unavailable")).toBe("Unavailable");
    expect(formatConnectionHealthLabel("authentication_required")).toBe("Failed");
    expect(formatConnectionHealthLabel("permission_limited")).toBe(
      "Limited permissions",
    );
  });

  it("maps states to badge variants", () => {
    expect(badgeVariantForConnectionState("connected")).toBe("success");
    expect(badgeVariantForConnectionState("not_configured")).toBe("neutral");
    expect(badgeVariantForConnectionState("permission_limited")).toBe("warning");
    expect(badgeVariantForConnectionState("authentication_required")).toBe("danger");
  });
});
