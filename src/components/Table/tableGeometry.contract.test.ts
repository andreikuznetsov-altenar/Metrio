import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("canonical table geometry CSS contract", () => {
  it("uses fixed layout and equal data column distribution in the shared table system", () => {
    const css = read("src/styles/ui-interaction-system.css");
    expect(css).toMatch(/\.performance-table\s*\{[\s\S]*table-layout:\s*fixed/);
    expect(css).toMatch(/\.performance-table col\.col-person[\s\S]*width:\s*auto/);
    expect(css).toMatch(/\.performance-table col\.col-action[\s\S]*width:\s*0\.01%/);
    expect(css).toMatch(
      /\.performance-table th,\s*\n\.performance-table td[\s\S]*text-align:\s*left/,
    );
    expect(css).toMatch(
      /\.performance-table td\.performance-table__num\s*\{[^}]*text-align:\s*left/,
    );
  });

  it("does not pin per-view percentage col widths in performance-dashboard.css", () => {
    const css = read("src/pages/performance/performance-dashboard.css");
    expect(css).not.toMatch(/performance-table--radar col\.col-person\s*\{[\s\S]*width:\s*\d+%/);
    expect(css).not.toMatch(/performance-table--team-workload col\./);
    expect(css).not.toMatch(/performance-table--delivery-risk col\.col-action\s*\{[\s\S]*width:\s*11%/);
  });

  it("routes dashboard queues through DashboardActionQueueTable", () => {
    expect(read("src/pages/home/dashboard/DashboardQueuePanel.tsx")).toContain(
      "DashboardActionQueueTable",
    );
    expect(read("src/pages/performance/ActionQueueSection.tsx")).toContain(
      "DashboardActionQueueTable",
    );
  });
});
