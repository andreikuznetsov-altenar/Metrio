import { describe, expect, it } from "vitest";
import { profileSubtitle } from "./profileSubtitle";
import type { CurrentUser } from "../types";

describe("profileSubtitle", () => {
  it("prefers Bamboo job title over app role", () => {
    const user: CurrentUser = {
      person: { id: "1", name: "Andrei", role: "lead" },
      jobTitle: "UX Team Leader Agreegain",
    };
    expect(profileSubtitle(user)).toBe("UX Team Leader Agreegain");
  });

  it("falls back to role label when job title missing", () => {
    const user: CurrentUser = {
      person: { id: "1", name: "Sam", role: "lead" },
    };
    expect(profileSubtitle(user)).toBe("Lead");
  });
});
