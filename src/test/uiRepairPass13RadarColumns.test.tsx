import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13 Radar severity and action columns", () => {
  it("maps colgroup badge before action and uses compact action width", () => {
    const source = read("src/pages/performance/TeamRadarView.tsx");
    expect(source).toMatch(
      /<col className="col-badge" \/>\s*<col className="col-action" \/>/,
    );
    expect(source).toContain('className="performance-table__severity"');
    expect(source).toContain('className="performance-table__action"');

    const css = read("src/pages/performance/performance-dashboard.css");
    const radarBlock = css.match(/\.performance-table--radar[\s\S]*?\.performance-table--delivery-risk/)?.[0];
    expect(radarBlock).toBeTruthy();
    expect(radarBlock).toMatch(/\.performance-table--radar col\.col-action[\s\S]*width:\s*0\.01%/);
    expect(radarBlock).not.toMatch(/\.performance-table--radar col\.col-action[\s\S]*width:\s*18%/);
    expect(radarBlock).toContain(".performance-table--radar .performance-table__severity");
  });
});
