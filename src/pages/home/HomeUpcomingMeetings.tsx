import { Button } from "../../components/Button/Button";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import type { MatchedMeeting } from "../../domain/calendar/calendarTypes";
import {
  isJoinWindowActive,
  periodPresetForOneOnOne,
} from "../../domain/calendar/buildUpcomingMeetings";
import { openExternalUrl } from "../../platform/openExternal";
import { openProjectCockpit } from "../../platform/projectCockpitNavigation";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { formatMeetingTime } from "../../domain/calendar/formatMeetingTime";

export interface HomeUpcomingMeetingsProps {
  meetings: MatchedMeeting[];
  managerView: boolean;
  jiraBaseUrl: string;
  onPrepareOneOnOne: (personId: string, periodPreset: "7d" | "30d" | "3m") => void;
  onOpenTeamOverview?: () => void;
}

export function HomeUpcomingMeetings({
  meetings,
  managerView,
  jiraBaseUrl,
  onPrepareOneOnOne,
  onOpenTeamOverview,
}: HomeUpcomingMeetingsProps) {
  if (!meetings.length) return null;

  const upcoming = meetings.slice(0, 6);

  return (
    <section
      className="home-card home-card--calendar"
      aria-label={managerView ? "Upcoming 1:1 and meetings" : "Upcoming"}
      data-testid="home-upcoming-meetings"
    >
      <h2 className="home-card__title">
        {managerView ? "Today" : "Upcoming"}
      </h2>
      <ul className="home-calendar-list">
        {upcoming.map((meeting) => (
          <li key={meeting.eventId} className="home-calendar-row">
            <div className="home-calendar-row__main">
              {meeting.kind === "one_on_one" && meeting.otherPersonId ? (
                <PersonAvatar
                  personId={meeting.otherPersonId}
                  displayName={meeting.otherPersonName ?? "Team member"}
                  size="sm"
                  className="home-calendar-row__avatar"
                />
              ) : null}
              <span className="home-calendar-row__time">
                {formatMeetingTime(meeting.start)}
              </span>
              <span className="home-calendar-row__title">
                {meeting.kind === "one_on_one" && meeting.otherPersonName
                  ? managerView
                    ? `1:1 · ${meeting.otherPersonName}`
                    : `1:1 with ${meeting.otherPersonName}`
                  : meeting.title}
              </span>
              {meeting.lastOneOnOneWithPerson && meeting.kind === "one_on_one" && (
                <span className="home-calendar-row__meta">
                  Last 1:1 · {formatMeetingTime(meeting.lastOneOnOneWithPerson, true)}
                </span>
              )}
            </div>
            <div className="home-calendar-row__actions">
              {meeting.kind === "one_on_one" && meeting.otherPersonId && (
                  <Button
                    variant="secondary"
                    data-testid="home-prepare-1-1"
                    onClick={() =>
                      onPrepareOneOnOne(
                        meeting.otherPersonId!,
                        periodPresetForOneOnOne(meeting.lastOneOnOneWithPerson),
                      )
                    }
                  >
                    Prepare
                  </Button>
                )}
              {meeting.kind === "team" && onOpenTeamOverview && (
                <Button variant="ghost" onClick={onOpenTeamOverview}>
                  Team overview
                </Button>
              )}
              {meeting.projectKey && (
                <Button
                  variant="ghost"
                  onClick={() => openProjectCockpit(meeting.projectKey!)}
                >
                  Project cockpit
                </Button>
              )}
              {meeting.jiraIssueKeys[0] && jiraBaseUrl && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    void openExternalUrl(
                      buildJiraIssueBrowseUrl(jiraBaseUrl, meeting.jiraIssueKeys[0]),
                    )
                  }
                >
                  Open {meeting.jiraIssueKeys[0]}
                </Button>
              )}
              {meeting.confluenceUrls[0] && (
                <Button
                  variant="ghost"
                  onClick={() => void openExternalUrl(meeting.confluenceUrls[0])}
                >
                  Confluence
                </Button>
              )}
              {meeting.calendarUrl && (
                <Button
                  variant="ghost"
                  onClick={() => void openExternalUrl(meeting.calendarUrl!)}
                >
                  Calendar
                </Button>
              )}
              {isJoinWindowActive(meeting) && meeting.joinUrl && (
                <Button
                  variant="primary"
                  onClick={() => void openExternalUrl(meeting.joinUrl!)}
                >
                  Join
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
