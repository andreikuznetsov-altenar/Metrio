import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Person } from "../../domain/people/types";
import { PersonIdentityHeader } from "./PersonIdentityHeader";
import { setAppClockFixed, setAppClock } from "../../platform/appClock";

vi.mock("../../components/PersonAvatar/PersonAvatar", () => ({ PersonAvatar: () => null }));

function person(availability: Person["availability"]): Person {
  return {
    id: "p1",
    bamboo: { id: "b1", displayName: "Nikita Volkov", firstName: "Nikita", lastName: "Volkov", workEmail: "n@altenar.com", jobTitle: "UX Designer", status: "Active" },
    jira: null,
    identity: { matchedBy: "email", warnings: [] },
    availability,
    workload: null,
    performance: null,
    issues: [],
    ownedIssues: [],
  } as unknown as Person;
}

describe("Person header availability badge", () => {
  it("FUTURE leave never renders as 'On leave' (Bamboo dates against the app clock)", () => {
    setAppClockFixed("2026-10-14T09:30:00.000Z");
    const { unmount } = render(
      <PersonIdentityHeader displayName="Nikita Volkov" jobTitle="UX Designer" person={person({ state: "vacation_soon", label: "Vacation · Oct 20–24", startDate: "2026-10-20", endDate: "2026-10-24", isHoliday: false })} />,
    );
    expect(screen.getByText("Vacation soon")).toBeInTheDocument();
    expect(screen.queryByText("On leave")).toBeNull();
    unmount();

    render(
      <PersonIdentityHeader displayName="Nikita Volkov" jobTitle="UX Designer" person={person({ state: "on_vacation", label: "Vacation · Oct 12–16", startDate: "2026-10-12", endDate: "2026-10-16", isHoliday: false })} />,
    );
    expect(screen.getByText("On leave")).toBeInTheDocument();
    setAppClock(null);
  });
});
