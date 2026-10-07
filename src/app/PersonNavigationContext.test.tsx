// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import {
  PersonNavigationProvider,
  usePersonNavigation,
} from "./PersonNavigationContext";
import { dispatchOpenPersonDetail } from "./performanceAnalyticsContext";

vi.mock("./CurrentUserContext", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("./PerformanceDataContext", () => ({
  usePerformanceData: vi.fn(),
}));

vi.mock("../pages/performance/PersonDetailDrawer", () => ({
  PersonDetailDrawer: ({
    personId,
    open,
  }: {
    personId: string;
    open: boolean;
  }) =>
    open ? <div data-testid="person-detail-drawer" data-person-id={personId} /> : null,
}));

import { useCurrentUser } from "./CurrentUserContext";
import { usePerformanceData } from "./PerformanceDataContext";

const mockUseCurrentUser = vi.mocked(useCurrentUser);
const mockUsePerformanceData = vi.mocked(usePerformanceData);

function RouteHandlerProbe({ onOpen }: { onOpen: (id: string) => void }) {
  const { registerPersonDrawerHandler } = usePersonNavigation();
  useEffect(
    () => registerPersonDrawerHandler((personId) => onOpen(personId)),
    [onOpen, registerPersonDrawerHandler],
  );
  return null;
}

describe("PersonNavigationProvider window events", () => {
  beforeEach(() => {
    cleanup();
    mockUseCurrentUser.mockReturnValue({
      currentUser: {
        person: { id: "person-sam", name: "Sam", role: "lead" },
        orgRole: "manager",
        team: { leadId: "person-sam", directReportIds: ["person-01"] },
      },
    } as ReturnType<typeof useCurrentUser>);
    mockUsePerformanceData.mockReturnValue({
      performanceControlsDisabled: false,
    } as ReturnType<typeof usePerformanceData>);
  });

  it("opens the hosted drawer from metrio-open-person when no route handler is registered", async () => {
    const { getByTestId } = render(
      <PersonNavigationProvider>
        <div />
      </PersonNavigationProvider>,
    );
    dispatchOpenPersonDetail("person-01");
    await waitFor(() => {
      expect(getByTestId("person-detail-drawer").getAttribute("data-person-id")).toBe(
        "person-01",
      );
    });
  });

  it("forwards metrio-open-person to the Performance route handler", async () => {
    const onOpen = vi.fn();
    render(
      <PersonNavigationProvider>
        <RouteHandlerProbe onOpen={onOpen} />
      </PersonNavigationProvider>,
    );
    dispatchOpenPersonDetail("person-01");
    await waitFor(() => {
      expect(onOpen).toHaveBeenCalledWith("person-01");
    });
  });
});
