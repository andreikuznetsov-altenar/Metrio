import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { TeamDeliveryRiskView } from "./TeamDeliveryRiskView";
import "../../styles/tokens.css";
import "../../styles/ui-interaction-system.css";
import "./performance-dashboard.css";

afterEach(() => {
  cleanup();
});

vi.mock("../../platform/preferences", () => ({
  loadPreferences: vi.fn(async () => ({
    jira: { baseUrl: "https://jira.example.com" },
  })),
}));

vi.mock("../../app/TaskJourneyContext", () => ({
  useTaskJourney: () => ({
    openTaskJourney: vi.fn(),
    closeTaskJourney: vi.fn(),
  }),
}));

describe("TeamDeliveryRiskView", () => {
  it("renders separate Issue and Description columns", async () => {
    render(
      <TeamDeliveryRiskView
        rows={[
          {
            issueKey: "UX-1",
            issueTitle: "Long title for testing",
            ownerId: "p1",
            ownerName: "Sam",
            age: "5d",
            riskReason: "Stale review",
            status: "In Review",
          },
        ]}
        onOpenPerson={() => undefined}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Issue" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "UX-1" }).getAttribute("href")).toContain(
        "/browse/UX-1",
      );
    });
    expect(screen.getByRole("button", { name: "Open Jira" })).toBeInTheDocument();
  });

  it("does not force horizontal overflow on the delivery risk table", () => {
    const { container } = render(
      <TeamDeliveryRiskView
        rows={[
          {
            issueKey: "UX-5726",
            issueTitle: "A long description that should wrap inside the table cell",
            ownerId: "p1",
            ownerName: "Sam",
            age: "5d",
            riskReason: "Stale review with a longer explanation",
            status: "In Review",
          },
        ]}
        onOpenPerson={() => undefined}
      />,
    );
    const table = container.querySelector(
      ".performance-table--delivery-risk",
    ) as HTMLTableElement;
    expect(table).toBeTruthy();
    const css = getComputedStyle(table);
    expect(css.minWidth === "0px" || css.minWidth === "0").toBe(true);
    const wrap = container.querySelector(
      ".performance-table-wrap--delivery-risk",
    ) as HTMLElement;
    expect(getComputedStyle(wrap).overflowX).toBe("visible");
    Object.defineProperty(table, "clientWidth", { value: 960, configurable: true });
    Object.defineProperty(table, "scrollWidth", { value: 960, configurable: true });
    expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth + 1);
  });

  it("keeps delivery risk actions inside the canonical action cell with flex gap", () => {
    render(
      <TeamDeliveryRiskView
        rows={[
          {
            issueKey: "UX-5726",
            issueTitle: "A long description that should wrap inside the table cell",
            ownerId: "p1",
            ownerName: "Sam",
            age: "5d",
            riskReason: "Stale review with a longer explanation",
            status: "In Review",
          },
        ]}
        onOpenPerson={() => undefined}
      />,
    );
    const actionCell = screen.getByTestId("delivery-risk-action-cell");
    expect(actionCell.className).toContain("performance-table__action-controls");
    const journey = screen.getByRole("button", { name: "View journey" });
    const jira = screen.getByRole("button", { name: "Open Jira" });
    expect(actionCell.contains(journey)).toBe(true);
    expect(actionCell.contains(jira)).toBe(true);

    const controlsStyle = getComputedStyle(actionCell);
    expect(controlsStyle.display).toBe("flex");

    const interactionCss = fs.readFileSync(
      path.resolve(process.cwd(), "src/styles/ui-interaction-system.css"),
      "utf8",
    );
    expect(interactionCss).toMatch(
      /\.performance-table__action-controls[\s\S]*gap:\s*var\(--space-2\)/,
    );

    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/performance/performance-dashboard.css"),
      "utf8",
    );
    expect(css).not.toMatch(
      /\.performance-delivery-risk__jira-btn[\s\S]*position:\s*absolute/,
    );
    expect(css).not.toMatch(
      /\.performance-table--delivery-risk[\s\S]*\.performance-table__action[\s\S]*margin-right:\s*-/,
    );
  });
});
