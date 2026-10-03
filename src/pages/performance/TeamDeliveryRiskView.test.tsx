import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TeamDeliveryRiskView } from "./TeamDeliveryRiskView";

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
});
