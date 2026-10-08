import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PersonIdentityHeader } from "../pages/performance/PersonIdentityHeader";
import {
  dispatchOpenPersonBrief,
  PERSON_DRAWER_CLOSE_EVENT,
} from "../app/performanceAnalyticsContext";
import { personAvailabilityBadgeLabel } from "../domain/availability/personAvailabilityCopy";
import type { Person } from "../domain/people/types";
import { testWorkload } from "../domain/testFixtures";

function minimalPerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "person-01",
    bamboo: {
      displayName: "Daria Chernova",
      jobTitle: "Junior UI UX Designer",
      workEmail: "daria@co.com",
      department: "Design",
      hireDate: "2024-01-01",
    },
    jira: { canonicalKey: "daria@co.com" },
    availability: { state: "available", label: "Available" },
    workload: testWorkload({
      level: "overloaded",
      capacityLoadPercent: 110,
      activeCount: 5,
      atRiskCount: 1,
      problematicCount: 0,
    }),
    performance: null,
    issues: [],
    ...overrides,
  } as Person;
}

describe("person experience pass 4B", () => {
  it("shows role once in identity header with availability and workload badges", () => {
    render(
      <PersonIdentityHeader
        personId="person-01"
        displayName="Daria Chernova"
        jobTitle="Junior UI UX Designer"
        person={minimalPerson()}
      />,
    );
    expect(screen.getAllByText("Junior UI UX Designer")).toHaveLength(1);
    expect(screen.getByTestId("person-availability-badge")).toHaveTextContent("Available");
    expect(screen.getByTestId("person-workload-badge")).toHaveTextContent("Overloaded");
  });

  it("uses short availability badge labels", () => {
    expect(
      personAvailabilityBadgeLabel({
        state: "on_vacation",
        label: "On time off · Sep 1–5",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      }),
    ).toBe("On leave");
  });

  it("dispatchOpenPersonBrief opens brief in the same person drawer without closing first", () => {
    const closeHandler = vi.fn();
    const briefHandler = vi.fn();
    window.addEventListener(PERSON_DRAWER_CLOSE_EVENT, closeHandler);
    window.addEventListener("metrio-open-person-brief", briefHandler);
    dispatchOpenPersonBrief({ personId: "person-01", prepForOneOnOne: true });
    expect(closeHandler).not.toHaveBeenCalled();
    expect(briefHandler).toHaveBeenCalledTimes(1);
    const briefDetail = (briefHandler.mock.calls[0]?.[0] as CustomEvent).detail;
    expect(briefDetail).toEqual({ personId: "person-01", prepForOneOnOne: true });
    window.removeEventListener(PERSON_DRAWER_CLOSE_EVENT, closeHandler);
    window.removeEventListener("metrio-open-person-brief", briefHandler);
  });
});
