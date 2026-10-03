export type MeetingKind =
  | "one_on_one"
  | "team"
  | "project"
  | "general";

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  self?: boolean;
}

export interface CalendarEventRaw {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink?: string;
  hangoutLink?: string;
  attendees: CalendarAttendee[];
}

export interface MatchedMeeting {
  eventId: string;
  title: string;
  start: string;
  end: string;
  kind: MeetingKind;
  /** High-confidence only */
  otherPersonId?: string;
  otherPersonName?: string;
  projectKey?: string;
  jiraIssueKeys: string[];
  confluenceUrls: string[];
  calendarUrl?: string;
  joinUrl?: string;
  oneOnOneTitleHint: boolean;
  lastOneOnOneWithPerson?: string;
}

export interface UpcomingMeetingsModel {
  fetchedAt: string;
  meetings: MatchedMeeting[];
  oneOnOnes: MatchedMeeting[];
}
