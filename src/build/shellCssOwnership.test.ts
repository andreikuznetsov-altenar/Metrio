import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

describe("shell CSS ownership", () => {
  it("foundation gallery CSS does not define production app-header or app-shell classes", () => {
    const foundationHeader = readFileSync(
      join(root, "app/AppHeader.css"),
      "utf8",
    );
    const foundationShell = readFileSync(join(root, "app/AppShell.css"), "utf8");
    expect(foundationHeader).not.toMatch(/\.app-header[^_-]/);
    expect(foundationShell).not.toMatch(/\.app-shell[^_-]/);
    expect(foundationHeader).toContain(".foundation-header");
    expect(foundationShell).toContain(".foundation-shell");
  });

  it("production shell CSS owns app-header and app-shell", () => {
    const header = readFileSync(join(root, "shell/AppHeader.css"), "utf8");
    const shell = readFileSync(
      join(root, "components/AppShell/AppShell.css"),
      "utf8",
    );
    expect(header).toMatch(/\.app-header\s*\{/);
    expect(shell).toMatch(/\.app-shell\s*\{/);
  });

  it("production performance fetch keeps visual fixture behind dynamic import", () => {
    const service = readFileSync(
      join(root, "services/performance/performanceDataService.ts"),
      "utf8",
    );
    expect(service).toContain('import.meta.env.VITE_VISUAL_FIXTURE === "1"');
    expect(service).toContain("fixtures/performanceFetchFixture");
    expect(service).not.toMatch(
      /^\s*import\s+\{[^}]+\}\s+from\s+["'].*fixtures\/performanceFetchFixture["']/m,
    );
  });
});
