import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.8A global primitives", () => {
  it("tables keep numeric cells left aligned", () => {
    const css = read("src/styles/ui-interaction-system.css");
    const numRule = css.match(
      /\.performance-table th\.performance-table__num,[\s\S]*?font-variant-numeric: tabular-nums;/,
    )?.[0];
    expect(numRule).toBeTruthy();
    expect(numRule).toContain("text-align: left");
    expect(numRule).not.toContain("text-align: right");
  });

  it("action column does not stretch and stays left aligned", () => {
    const css = read("src/styles/ui-interaction-system.css");
    expect(css).toMatch(/\.performance-table col\.col-action[\s\S]*width:\s*0\.01%/);
    expect(css).toMatch(/\.performance-table__action[\s\S]*text-align:\s*left/);
  });

  it("scrollbars use overlay gutter and 4px tokens", () => {
    const css = read("src/styles/ui-interaction-system.css");
    expect(css).toContain("--metrio-scrollbar-size");
    expect(css).toContain("--metrio-scrollbar-inset");
    expect(css).toMatch(/\.metrio-scroll[\s\S]*scrollbar-gutter:\s*auto/);
    expect(css).not.toMatch(/scrollbar-gutter:\s*stable/);
  });

  it("EmptyState defines icon-title spacing of 8px", () => {
    const css = read("src/components/EmptyState/empty-state.css");
    expect(css).toContain("margin-top: var(--icon-text-gap)");
    expect(read("src/components/EmptyState/EmptyState.tsx")).toContain(
      "metrio-empty-state__title",
    );
  });

  it("shared text link styles cover task count links", () => {
    const css = read("src/styles/ui-interaction-system.css");
    expect(css).toContain(".grouped-issue-preview__count-link");
    expect(css).toMatch(/\.grouped-issue-preview__count-link[\s\S]*var\(--color-accent\)/);
  });

  it("Attention Now avoids duplicate single-task subject", () => {
    const source = read("src/pages/home/dashboard/DashboardAttentionNow.tsx");
    expect(source).toContain("shouldAppendAttentionSubjectTitle");
  });

  it("tabular modal table wrap uses secondary hidden-thumb scroll without stable gutter", () => {
    const css = read("src/components/Modal/tabular-modal.css");
    expect(css).toContain("scrollbar-gutter: auto");
    const modal = read("src/components/TaskListModal/TaskListModal.tsx");
    expect(modal).toContain("metrio-scroll--hidden-thumb");
  });
});
