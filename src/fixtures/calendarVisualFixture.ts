import type { CalendarEventRaw } from "../domain/calendar/calendarTypes";

const FIXTURE_KEY = "metrio-calendar-visual-fixture";

export interface CalendarVisualFixture {
  selfEmail: string;
  events: CalendarEventRaw[];
}

export function readCalendarVisualFixture(): CalendarVisualFixture | null {
  if (import.meta.env.VITE_VISUAL_FIXTURE !== "1") {
    return null;
  }
  try {
    const raw = localStorage.getItem(FIXTURE_KEY);
    if (raw) {
      return JSON.parse(raw) as CalendarVisualFixture;
    }
  } catch {
    /* ignore */
  }
  return buildDefaultCalendarVisualFixture();
}

export function buildDefaultCalendarVisualFixture(): CalendarVisualFixture {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const base = `${y}-${m}-${d}`;
  return {
    selfEmail: "person-sam@visual.metrio",
    events: [
      {
        id: "evt-team",
        title: "Team Weekly",
        start: `${base}T10:00:00+02:00`,
        end: `${base}T11:00:00+02:00`,
        attendees: [
          { email: "person-sam@visual.metrio", self: true },
          { email: "person-01@visual.metrio" },
          { email: "person-02@visual.metrio" },
        ],
      },
      {
        id: "evt-1-1",
        title: "Sync",
        start: `${base}T14:00:00+02:00`,
        end: `${base}T14:30:00+02:00`,
        htmlLink: "https://calendar.google.com/event?eid=fixture",
        hangoutLink: "https://meet.google.com/fixture",
        attendees: [
          { email: "person-sam@visual.metrio", self: true },
          { email: "person-01@visual.metrio" },
        ],
      },
      {
        id: "evt-project",
        title: "UX project review",
        start: `${base}T16:30:00+02:00`,
        end: `${base}T17:00:00+02:00`,
        attendees: [{ email: "person-sam@visual.metrio", self: true }],
      },
    ],
  };
}

export function serializeCalendarVisualFixtureForPlaywright(): string {
  return JSON.stringify(buildDefaultCalendarVisualFixture());
}
