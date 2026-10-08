// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AnalyticsEvidenceIssue } from "../../domain/analytics/analyticsEvidenceTypes";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";
import { TooltipProvider } from "../../components/Tooltip/Tooltip";

const issue: AnalyticsEvidenceIssue = {
  issueKey: "UX-5726",
  title: "Portal Design",
  personId: "p1",
  personName: "Andrei Kuznetsov",
  outcome: "backflow",
  backflowCount: 1,
};

function centerOf(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function stubSquareIconGeometry(button: HTMLElement, svg: SVGElement) {
  const buttonRect = {
    x: 100,
    y: 40,
    left: 100,
    top: 40,
    right: 132,
    bottom: 72,
    width: 32,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect;
  // Canonical 16×16 icon optically centered in 32×32 control.
  const svgRect = {
    x: 108,
    y: 48,
    left: 108,
    top: 48,
    right: 124,
    bottom: 64,
    width: 16,
    height: 16,
    toJSON: () => ({}),
  } as DOMRect;
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue(buttonRect);
  vi.spyOn(svg, "getBoundingClientRect").mockReturnValue(svgRect);
  return { buttonRect, svgRect };
}

describe("Backflows analytics Jira action icon geometry", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses canonical icon-btn flex centering without mono/line-height offset", () => {
    render(
      <TooltipProvider>
        <AnalyticsIssueRow issue={issue} showBackflowSummary />
      </TooltipProvider>,
    );

    const button = screen.getByTestId("analytics-issue-jira-action");
    expect(button).toHaveClass("icon-btn");
    expect(button).toHaveClass("icon-btn--compact");
    expect(button).toHaveClass("analytics-issue-row__jira");
    expect(button).toHaveClass("entity-link");
    expect(button.className).not.toMatch(/entity-link--mono/);

    const svg = button.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");

    const { buttonRect, svgRect } = stubSquareIconGeometry(
      button,
      svg as SVGElement,
    );
    const buttonCenter = centerOf(buttonRect);
    const svgCenter = centerOf(svgRect);
    expect(Math.abs(buttonCenter.x - svgCenter.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(buttonCenter.y - svgCenter.y)).toBeLessThanOrEqual(1);
  });

  it("keeps icon centered across multiple backflow rows", () => {
    const issues = ["UX-1", "UX-2", "UX-3"].map((issueKey) => ({
      ...issue,
      issueKey,
    }));
    render(
      <TooltipProvider>
        {issues.map((row) => (
          <AnalyticsIssueRow key={row.issueKey} issue={row} showBackflowSummary />
        ))}
      </TooltipProvider>,
    );

    const buttons = screen.getAllByTestId("analytics-issue-jira-action");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      const svg = button.querySelector("svg") as SVGElement;
      const { buttonRect, svgRect } = stubSquareIconGeometry(button, svg);
      const buttonCenter = centerOf(buttonRect);
      const svgCenter = centerOf(svgRect);
      expect(Math.abs(buttonCenter.x - svgCenter.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(buttonCenter.y - svgCenter.y)).toBeLessThanOrEqual(1);
    }
  });

  it("CSS contract: hover/focus does not translate the icon", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "./analytics-issue-row.css"),
      "utf8",
    );
    expect(css).toMatch(
      /a\.entity-link\.icon-btn\.analytics-issue-row__jira\s*\{[\s\S]*display:\s*inline-flex/,
    );
    expect(css).toMatch(
      /a\.entity-link\.icon-btn\.analytics-issue-row__jira\s*\{[\s\S]*align-items:\s*center/,
    );
    expect(css).toMatch(
      /a\.entity-link\.icon-btn\.analytics-issue-row__jira\s*\{[\s\S]*justify-content:\s*center/,
    );
    expect(css).toMatch(
      /a\.entity-link\.icon-btn\.analytics-issue-row__jira svg\s*\{[\s\S]*display:\s*block/,
    );
    expect(css).toMatch(
      /a\.entity-link\.icon-btn\.analytics-issue-row__jira:hover[\s\S]*transform:\s*none/,
    );
    expect(css).not.toMatch(/analytics-issue-row__jira[\s\S]{0,200}top:\s*-?\d+px/);
    expect(css).not.toMatch(/analytics-issue-row__jira[\s\S]{0,200}left:\s*-?\d+px/);
  });
});
