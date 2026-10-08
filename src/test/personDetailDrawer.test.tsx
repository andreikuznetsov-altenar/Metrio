import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonDetailDrawer } from "../pages/performance/PersonDetailDrawer";
import type { PersonAnalyticsWorkspace } from "../domain/analytics/personAnalyticsWorkspace";

vi.mock("../app/PerformanceDataContext", () => ({
  usePerformanceData: vi.fn(),
}));

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("../app/performanceAnalyticsContext", () => ({
  useOptionalPerformanceAnalytics: vi.fn(() => null),
  dispatchOpenPersonBrief: vi.fn(),
}));

vi.mock("../hooks/useOnboardingResources", () => ({
  useOnboardingResources: vi.fn(() => ({ matched: null, resources: [] })),
}));

vi.mock("../platform/preferences", () => ({
  loadPreferences: vi.fn(async () => ({})),
}));

vi.mock("../pages/performance/PersonBriefDrawer", () => ({
  PersonBriefDrawerPanel: () => null,
}));

import { usePerformanceData } from "../app/PerformanceDataContext";
import { useCurrentUser } from "../app/CurrentUserContext";

const mockUsePerformanceData = vi.mocked(usePerformanceData);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

const workspace: PersonAnalyticsWorkspace = {
  personId: "914",
  personName: "Sam Dev",
  role: "Engineer",
  availability: "Available",
  workload: "Normal",
  attention: [],
  performanceKpis: [],
  cycleTime: [],
  trends: [],
  contextLine: "Team context",
  activeWorkCount: 0,
  workRows: [],
  problematicWork: [],
  historyMonth: [],
  historyWeek: [],
  historyQuarter: [],
};

describe("PersonDetailDrawer header", () => {
  afterEach(() => cleanup());

  it("places Profile/Brief tabs before Close in the drawer header toolbar", () => {
    mockUsePerformanceData.mockReturnValue({
      viewModels: {
        getPerson: () => null,
        getPersonAnalytics: () => workspace,
      },
    } as ReturnType<typeof usePerformanceData>);

    mockUseCurrentUser.mockReturnValue({
      currentUser: {
        person: { id: "1114", name: "Lead", role: "lead" },
        team: { directReportIds: ["914"] },
      },
    } as ReturnType<typeof useCurrentUser>);

    render(
      <PersonDetailDrawer personId="914" open onClose={vi.fn()} />,
    );

    const toolbar = document.querySelector(".drawer--person-detail .drawer__header-toolbar");
    expect(toolbar).toBeTruthy();
    const tabs = toolbar!.querySelector(".person-drawer-view-tabs");
    expect(tabs).toBeTruthy();
    expect(tabs).toHaveTextContent("Profile");
    expect(tabs).toHaveTextContent("Brief");
    const buttons = toolbar!.querySelectorAll("button");
    expect(buttons[buttons.length - 1]).toHaveAccessibleName(/Close drawer/i);
    expect(screen.getByText("Sam Dev")).toBeTruthy();
    expect(
      document.querySelector('[data-person-drawer-view="profile"]:not([hidden])'),
    ).toBeTruthy();
  });
});
