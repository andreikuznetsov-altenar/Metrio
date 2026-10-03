import type { CalendarEventRaw, MeetingKind } from "./calendarTypes";

export interface PersonLookup {
  email: string;
  personId: string;
  displayName: string;
}

export interface ClassifyMeetingInput {
  event: CalendarEventRaw;
  selfEmail: string;
  authorizedPeople: PersonLookup[];
  directReportIds: string[];
  teamMemberIds: string[];
  managerPersonId?: string;
}

export interface ClassifyMeetingResult {
  kind: MeetingKind;
  otherPersonId?: string;
  otherPersonName?: string;
  projectKey?: string;
  oneOnOneTitleHint: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function titleHintsOneOnOne(title: string): boolean {
  return /\b1[:\s-]?1\b|one[\s-]on[\s-]one|1-on-1/i.test(title);
}

export function classifyMeeting(input: ClassifyMeetingInput): ClassifyMeetingResult {
  const self = normalizeEmail(input.selfEmail);
  const others = input.event.attendees.filter(
    (a) => !a.self && normalizeEmail(a.email) !== self,
  );
  const hint = titleHintsOneOnOne(input.event.title);

  const peopleByEmail = new Map(
    input.authorizedPeople.map((p) => [normalizeEmail(p.email), p]),
  );

  const matchedOthers = others
    .map((a) => peopleByEmail.get(normalizeEmail(a.email)))
    .filter((p): p is PersonLookup => Boolean(p));

  if (others.length === 1 && matchedOthers.length === 1) {
    const person = matchedOthers[0];
    const isDr = input.directReportIds.includes(person.personId);
    const isManager =
      input.managerPersonId && person.personId === input.managerPersonId;
    if (isDr || isManager) {
      return {
        kind: "one_on_one",
        otherPersonId: person.personId,
        otherPersonName: person.displayName,
        oneOnOneTitleHint: hint,
      };
    }
  }

  const teamOverlap = matchedOthers.filter((p) =>
    input.teamMemberIds.includes(p.personId),
  );
  if (teamOverlap.length >= 2 || (teamOverlap.length >= 1 && others.length <= 6)) {
    return { kind: "team", oneOnOneTitleHint: hint };
  }

  const jiraKeys = extractProjectFromTitle(input.event.title);
  if (jiraKeys) {
    return { kind: "project", projectKey: jiraKeys, oneOnOneTitleHint: hint };
  }

  return { kind: "general", oneOnOneTitleHint: hint };
}

/** Only high-confidence project keys in title (e.g. "UX sync") */
function extractProjectFromTitle(title: string): string | undefined {
  const match = /\b(?:project\s+)?([A-Z][A-Z0-9]{1,9})\s+(?:sync|standup|review|meeting)\b/i.exec(
    title,
  );
  return match?.[1]?.toUpperCase();
}
