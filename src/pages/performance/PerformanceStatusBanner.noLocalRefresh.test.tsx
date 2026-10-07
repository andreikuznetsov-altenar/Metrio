import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("page-local refresh error presentation is removed", () => {
  it("PerformanceStatusBanner no longer renders cached-refresh copy or Retry", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/performance/PerformanceStatusBanner.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Couldn't refresh data. Showing the last successful result.");
    expect(source).not.toContain("Couldn't refresh performance data.");
    expect(source).toContain("Couldn't load performance data.");
  });

  it("Dashboard sync status no longer emits a local refresh-failure line", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/domain/home/dashboardSyncStatus.ts"),
      "utf8",
    );
    expect(source).not.toContain("Couldn't refresh · showing data from");
  });
});
