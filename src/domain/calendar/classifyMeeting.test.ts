import { describe, expect, it } from "vitest";
import { classifyMeeting } from "./classifyMeeting";
import type { CalendarEventRaw } from "./calendarTypes";

function event(attendees: { email: string; self?: boolean }[], title = "Sync"): CalendarEventRaw {
  return {
    id: "1",
    title,
    start: "2026-10-03T14:00:00+02:00",
    end: "2026-10-03T14:30:00+02:00",
    attendees: attendees.map((a) => ({
      email: a.email,
      self: a.self,
    })),
  };
}

describe("classifyMeeting", () => {
  const people = [
    { email: "mgr@co.com", personId: "mgr", displayName: "Manager" },
    { email: "daria@co.com", personId: "daria", displayName: "Daria" },
    { email: "peer@co.com", personId: "peer", displayName: "Peer" },
  ];

  it("detects 1:1 with direct report", () => {
    const result = classifyMeeting({
      event: event(
        [{ email: "mgr@co.com", self: true }, { email: "daria@co.com" }],
        "Weekly sync",
      ),
      selfEmail: "mgr@co.com",
      authorizedPeople: people,
      directReportIds: ["daria"],
      teamMemberIds: ["daria", "peer"],
    });
    expect(result.kind).toBe("one_on_one");
    expect(result.otherPersonId).toBe("daria");
  });

  it("does not label 1:1 from title alone", () => {
    const result = classifyMeeting({
      event: event(
        [
          { email: "mgr@co.com", self: true },
          { email: "daria@co.com" },
          { email: "peer@co.com" },
        ],
        "1:1 block",
      ),
      selfEmail: "mgr@co.com",
      authorizedPeople: people,
      directReportIds: ["daria"],
      teamMemberIds: ["daria", "peer"],
    });
    expect(result.kind).not.toBe("one_on_one");
  });

  it("labels two-person meeting as general when attendee is unknown", () => {
    const result = classifyMeeting({
      event: event(
        [{ email: "mgr@co.com", self: true }, { email: "vendor@external.com" }],
        "1:1",
      ),
      selfEmail: "mgr@co.com",
      authorizedPeople: people,
      directReportIds: ["daria"],
      teamMemberIds: ["daria", "peer"],
    });
    expect(result.kind).toBe("general");
  });
});
