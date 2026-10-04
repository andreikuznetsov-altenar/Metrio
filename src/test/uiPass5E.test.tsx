import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { badgeVariantForAttentionLabel } from "../platform/attentionSemanticBadge";

describe("UI Repair Pass 5E", () => {
  it("defines 36px default control height in tokens", () => {
    const tokens = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");
    expect(tokens).toMatch(/--control-height:\s*36px/);
    expect(tokens).toMatch(/--button-group-gap:\s*8px/);
  });

  it("uses control height on default button", () => {
    const css = readFileSync(resolve(process.cwd(), "src/components/Button/Button.css"), "utf8");
    expect(css).toMatch(/height:\s*var\(--control-height\)/);
    expect(css).toMatch(/\.btn--compact/);
  });

  it("maps attention reasons to semantic badge variants", () => {
    expect(badgeVariantForAttentionLabel("No activity")).toBe("warning");
    expect(badgeVariantForAttentionLabel("Overloaded")).toBe("warning");
    expect(badgeVariantForAttentionLabel("Available")).toBe("success");
    expect(badgeVariantForAttentionLabel("On Hold")).toBe("warning");
  });

  it("uses radius-card on content cards", () => {
    const css = readFileSync(resolve(process.cwd(), "src/components/Card/Card.css"), "utf8");
    expect(css).toMatch(/border-radius:\s*var\(--radius-card\)/);
  });

  it("drawer header uses flex padding tokens not absolute close offset", () => {
    const analytics = readFileSync(
      resolve(process.cwd(), "src/pages/performance/analytics-drilldown-drawer.css"),
      "utf8",
    );
    expect(analytics).not.toMatch(/56px/);
    const drawer = readFileSync(resolve(process.cwd(), "src/components/Drawer/Drawer.css"), "utf8");
    expect(drawer).toMatch(/--drawer-header-padding/);
  });
});
