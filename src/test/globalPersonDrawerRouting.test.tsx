// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { GlobalPersonDetailDrawer } from "../app/GlobalPersonDetailDrawer";
import { navigateViewPerson } from "../app/ctaRouting";

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("../pages/performance/PersonDetailDrawer", () => ({
  PersonDetailDrawer: ({
    personId,
    open,
  }: {
    personId: string;
    open: boolean;
  }) =>
    open ? (
      <div data-testid="person-detail-drawer" data-person-id={personId}>
        Person drawer
      </div>
    ) : null,
}));

import { useCurrentUser } from "../app/CurrentUserContext";

const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe("Global person drawer routing", () => {
  beforeEach(() => {
    cleanup();
    mockUseCurrentUser.mockReturnValue({
      currentUser: {
        person: { id: "person-sam", name: "Sam", role: "lead" },
        orgRole: "manager",
        team: { leadId: "person-sam", directReportIds: ["person-01"] },
      },
    } as ReturnType<typeof useCurrentUser>);
  });

  it("opens drawer for metrio-open-person on home route", async () => {
    render(<GlobalPersonDetailDrawer activeRoute="home" />);
    navigateViewPerson("person-01");
    await waitFor(() => {
      expect(screen.getByTestId("person-detail-drawer")).toBeTruthy();
    });
    expect(screen.getByTestId("person-detail-drawer").getAttribute("data-person-id")).toBe(
      "person-01",
    );
  });

  it("does not host drawer on performance route (analytics page owns it)", async () => {
    render(<GlobalPersonDetailDrawer activeRoute="performance" />);
    navigateViewPerson("person-01");
    await waitFor(() => {
      expect(screen.queryByTestId("person-detail-drawer")).toBeNull();
    });
  });
});
