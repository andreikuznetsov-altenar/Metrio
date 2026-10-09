import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TeamPerformanceSnapshot } from "../domain/performance";
import { performanceHelp } from "../domain/performance/performanceHelp";
import { TooltipProvider } from "../components/Tooltip/Tooltip";
import { TeamOverviewView } from "../pages/performance/TeamOverviewView";

vi.mock("../app/feedbackSurveyStore", () => ({
  useFeedbackSurveyStore: (selector: (state: { data: null }) => unknown) =>
    selector({ data: null }),
}));

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: { person: { role: "lead" } },
  }),
}));

vi.mock("../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    data: { teamSnapshot: { persons: [] } },
  }),
}));

vi.mock("../app/TaskJourneyContext", () => ({
  useOpenTaskJourneyFromKey: () => () => undefined,
}));

function renderOverview(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const snapshot: TeamPerformanceSnapshot = {
  directReportIds: ["person-01"],
  summary: [
    { label: "Efficiency", value: "86%" },
    { label: "First pass", value: "93%" },
    { label: "Completed", value: "5" },
    { label: "Backflows", value: "2" },
  ],
  attention: [],
  attentionTotalCount: 0,
  trends: [],
  workload: [],
  timeOff: [],
  personDetails: {},
};

const secondaryEmpty = {
  people: [],
  radar: [],
  deliveryRisk: [],
};

describe("TeamOverviewView analytics drill-down", () => {
  it("opens Completed drill-down from KPI card without Help icon triggering it", async () => {
    const user = userEvent.setup();
    const onOpenMetricDrilldown = vi.fn();

    renderOverview(
      <TeamOverviewView
        snapshot={snapshot}
        secondary={secondaryEmpty}
        onOpenPerson={() => {}}
        onOpenMetricDrilldown={onOpenMetricDrilldown}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /View Completed details/i }),
    );
    expect(onOpenMetricDrilldown).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: performanceHelp.completed }));
    expect(onOpenMetricDrilldown).toHaveBeenCalledTimes(1);
  });
});
