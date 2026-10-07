import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.7D attention and team brief", () => {
  it("centralizes task display policy in domain helper", () => {
    const source = read("src/domain/actions/taskIssueDisplayPolicy.ts");
    expect(source).toContain("shouldShowInlineTaskIssue");
    expect(source).toContain("shouldShowTaskCountLink");
  });

  it("GroupedIssuePreview uses count link only for multiple issues", () => {
    const source = read("src/components/GroupedIssuePreview/GroupedIssuePreview.tsx");
    expect(source).toContain("taskIssueDisplayPolicy");
    expect(source).toContain("formatTaskCountLabel");
    expect(source).not.toContain("INLINE_PREVIEW_MAX");
  });

  it("Attention Now uses GroupedIssuePreview instead of inline key lists", () => {
    const source = read("src/pages/home/dashboard/DashboardAttentionNow.tsx");
    expect(source).toContain("GroupedIssuePreview");
    expect(source).not.toMatch(/keys\.map\(\(issueKey/);
  });

  it("Team Brief workload uses donut layout with shared segment builder", () => {
    const css = read("src/components/charts/team-workload-donut.css");
    expect(css).toContain(".team-workload-donut__layout");
    const component = read("src/components/charts/TeamWorkloadDonut.tsx");
    expect(component).toContain("buildTeamWorkloadDonutSegments");
    expect(component).toContain("PieChart");
  });
});
