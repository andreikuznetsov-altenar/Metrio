// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ATLASSIAN_API_TOKEN_URL, getBambooApiKeyHelpUrl } from "../config/links";
import {
  badgeVariantForConnectionState,
  formatConnectionHealthLabel,
} from "../platform/observability/diagnosticsHealthPresentation";

vi.mock("../platform/openExternal", () => ({
  openExternalUrl: vi.fn(),
}));

describe("UI pass 5B — attention rules layout", () => {
  it("defines a four-column attention rules grid", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../pages/settings/settings.css"),
      "utf8",
    );
    expect(css).toContain(".settings-field-grid--4");
    expect(css).toMatch(
      /\.settings-field-grid--4[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(css).toMatch(/input--settings-number[\s\S]*appearance:\s*textfield/);
    expect(css).toMatch(/-webkit-appearance:\s*none/);
  });
});

describe("UI pass 5B — credential helpers", () => {
  it("reuses Atlassian and Bamboo help URLs from ConnectionScreen", () => {
    expect(ATLASSIAN_API_TOKEN_URL).toContain("atlassian.com");
    expect(getBambooApiKeyHelpUrl()).toContain("api_keys");
  });

  it("keeps credential action rows at 8px gap without full-width buttons", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../pages/settings/settings.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.settings-credential-actions[\s\S]*gap:\s*var\(--button-group-gap\)/,
    );
    expect(css).toMatch(/\.settings-credential-actions \.btn[\s\S]*width:\s*auto/);
  });
});

describe("UI pass 5B — diagnostics presentation", () => {
  it("humanizes diagnostic states and maps badge variants", () => {
    expect(formatConnectionHealthLabel("not_configured")).toBe("Not configured");
    expect(formatConnectionHealthLabel("connected")).toBe("Connected");
    expect(badgeVariantForConnectionState("connected")).toBe("success");
  });

  it("uses a compact advanced-details toggle", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../pages/settings/settings.css"),
      "utf8",
    );
    expect(css).toMatch(/\.diagnostics-advanced-toggle[\s\S]*width:\s*auto/);
  });
});
