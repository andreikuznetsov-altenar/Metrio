import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TeamDeliveryRiskView } from "./TeamDeliveryRiskView";
import "./performance-dashboard.css";

vi.mock("../../platform/preferences", () => ({
  loadPreferences: vi.fn(async () => ({
    jira: { baseUrl: "https://jira.example.com" },
  })),
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
});
