import { classifyMeeting, type PersonLookup } from "./classifyMeeting";
import type {
  CalendarEventRaw,
  MatchedMeeting,
  UpcomingMeetingsModel,
} from "./calendarTypes";
import {
  extractConfluenceUrlsFromText,
  extractJiraKeysFromText,
} from "./extractMeetingLinks";

export interface BuildUpcomingMeetingsInput {
  events: CalendarEventRaw[];
  selfEmail: string;
  selfPersonId: string;
  authorizedPeople: PersonLookup[];
  directReportIds: string[];
  teamMemberIds: string[];
  managerPersonId?: string;
  now?: Date;
}

export function mapRawEvent(dto: {
  id: string;
  title: string;
  start: string;
  end: string;
  html_link?: string | null;
  hangout_link?: string | null;
  attendees: { email: string; display_name?: string | null; self_: boolean }[];
}): CalendarEventRaw {
  return {
    id: dto.id,
    title: dto.title,
    start: dto.start,
    end: dto.end,
    htmlLink: dto.html_link ?? undefined,
    hangoutLink: dto.hangout_link ?? undefined,
    attendees: dto.attendees.map((a) => ({
      email: a.email,
      displayName: a.display_name ?? undefined,
      self: a.self_,
    })),
  };
}

export function buildUpcomingMeetings(
  input: BuildUpcomingMeetingsInput,
): UpcomingMeetingsModel {
  const now = input.now ?? new Date();
  const meetings: MatchedMeeting[] = [];
  const pastOneOnOnes = new Map<string, string>();

  for (const event of input.events) {
    const endMs = Date.parse(event.end || event.start);
    const startMs = Date.parse(event.start);
    if (!Number.isFinite(startMs)) continue;

    const classification = classifyMeeting({
      event,
      selfEmail: input.selfEmail,
      authorizedPeople: input.authorizedPeople,
      directReportIds: input.directReportIds,
      teamMemberIds: input.teamMemberIds,
      managerPersonId: input.managerPersonId,
    });

    const jiraIssueKeys = extractJiraKeysFromText(event.title);
    const confluenceUrls = extractConfluenceUrlsFromText(event.title);

    const joinUrl = event.hangoutLink;
    const matched: MatchedMeeting = {
      eventId: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      kind: classification.kind,
      otherPersonId: classification.otherPersonId,
      otherPersonName: classification.otherPersonName,
      projectKey: classification.projectKey,
      jiraIssueKeys,
      confluenceUrls,
      calendarUrl: event.htmlLink,
      joinUrl,
      oneOnOneTitleHint: classification.oneOnOneTitleHint,
    };

    if (
      classification.kind === "one_on_one" &&
      classification.otherPersonId &&
      endMs < now.getTime()
    ) {
      const prev = pastOneOnOnes.get(classification.otherPersonId);
      if (!prev || Date.parse(prev) < startMs) {
        pastOneOnOnes.set(classification.otherPersonId, event.start);
      }
    }

    if (endMs >= now.getTime() - 15 * 60 * 1000) {
      meetings.push(matched);
    }
  }

  meetings.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  for (const m of meetings) {
    if (m.kind === "one_on_one" && m.otherPersonId) {
      const last = pastOneOnOnes.get(m.otherPersonId);
      if (last) m.lastOneOnOneWithPerson = last;
    }
  }

  const oneOnOnes = meetings.filter((m) => m.kind === "one_on_one");

  return {
    fetchedAt: now.toISOString(),
    meetings: meetings.filter((m) => Date.parse(m.end) >= now.getTime()),
    oneOnOnes: oneOnOnes.filter((m) => Date.parse(m.end) >= now.getTime()),
  };
}

export function periodPresetForOneOnOne(lastIso?: string, now = new Date()): "7d" | "30d" | "3m" {
  if (!lastIso) return "30d";
  const days = Math.floor(
    (now.getTime() - Date.parse(lastIso)) / (24 * 60 * 60 * 1000),
  );
  if (days <= 7) return "7d";
  if (days <= 30) return "30d";
  return "3m";
}

export function isJoinWindowActive(meeting: MatchedMeeting, now = new Date()): boolean {
  const start = Date.parse(meeting.start);
  const end = Date.parse(meeting.end);
  if (!Number.isFinite(start) || !meeting.joinUrl) return false;
  const windowStart = start - 10 * 60 * 1000;
  return now.getTime() >= windowStart && now.getTime() <= end + 5 * 60 * 1000;
}
