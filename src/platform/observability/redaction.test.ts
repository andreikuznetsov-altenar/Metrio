import { describe, expect, it } from "vitest";
import {
  buildPreferencesSafeSnapshot,
  redactEmail,
  redactPath,
  scrubSecretsFromText,
} from "./redaction";
import { DEFAULT_PREFERENCES } from "../preferences";

describe("redaction", () => {
  it("redacts emails in text", () => {
    const out = scrubSecretsFromText("user anna@company.com failed");
    expect(out).not.toContain("anna@company.com");
    expect(out).toContain("email_");
  });

  it("redacts home paths", () => {
    expect(redactPath("/Users/john/Library/Metrio")).toBe(
      "/Users/[user]/Library/Metrio",
    );
  });

  it("does not include raw email in safe prefs", () => {
    const safe = buildPreferencesSafeSnapshot({
      ...DEFAULT_PREFERENCES,
      workEmail: "secret.person@corp.example",
      jiraEmail: "secret.person@corp.example",
    });
    expect(JSON.stringify(safe)).not.toContain("secret.person@corp.example");
    expect(redactEmail("secret.person@corp.example")).not.toContain("@");
  });
});
