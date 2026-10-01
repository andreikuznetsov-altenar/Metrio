import { getWorkingDurationMs } from './dates';
import { isReverseTransition } from './transitions';
import { getCanonicalTeamMember, normalizeTeamIdentity } from './users';
import type { IssueEvent, TeamIdentityIndex } from './types';

interface ChangelogHistory {
  created?: string;
  author?: { displayName?: string; accountId?: string; emailAddress?: string };
  items?: Array<{
    field?: string;
    fromString?: string;
    toString?: string;
  }>;
}

function getAuthorName(history: ChangelogHistory): string {
  const author = history.author || {};
  return author.displayName || author.accountId || author.emailAddress || '';
}

/** Port of legacy buildIssueEvents_ */
export function buildIssueEvents(
  changelogItems: ChangelogHistory[],
  teamIdentityIndex?: TeamIdentityIndex,
): IssueEvent[] {
  const events: IssueEvent[] = [];

  changelogItems.forEach((history) => {
    const changedAt = history.created || '';
    const changedBy = getAuthorName(history);

    (history.items || []).forEach((item) => {
      if (item.field === 'status') {
        events.push({
          eventType: 'Status',
          changedAt,
          changedBy,
          fromValue: item.fromString || '',
          toValue: item.toString || '',
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        });
      }

      if (item.field === 'assignee') {
        const fromValue = item.fromString || '';
        const toValue = item.toString || '';
        const fromCanonical = teamIdentityIndex
          ? getCanonicalTeamMember(fromValue, teamIdentityIndex)
          : '';
        const toCanonical = teamIdentityIndex
          ? getCanonicalTeamMember(toValue, teamIdentityIndex)
          : '';

        events.push({
          eventType: 'Assignee',
          changedAt,
          changedBy,
          fromValue,
          toValue,
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: !!(fromCanonical && !toCanonical),
          isReturnToTeam: !!(!fromCanonical && toCanonical),
          excludeFromEfficiencyBackflow: false,
        });
      }
    });
  });

  events.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

  let prevStatusAt: string | null = null;

  events.forEach((e) => {
    if (e.eventType !== 'Status') return;

    e.timeSincePreviousStatusMs = prevStatusAt
      ? getWorkingDurationMs(prevStatusAt, e.changedAt)
      : null;

    prevStatusAt = e.changedAt;

    const normalizedFrom = normalizeTeamIdentity(e.fromValue || '');
    const normalizedTo = normalizeTeamIdentity(e.toValue || '');

    const isReviewToHold =
      (normalizedFrom === 'review' || normalizedFrom.includes('in review')) &&
      (normalizedTo.includes('hold') || normalizedTo.includes('blocked'));

    e.excludeFromEfficiencyBackflow = isReviewToHold;
    e.isBackflow = isReverseTransition(e.fromValue, e.toValue);
  });

  return events;
}

export function getStatusEventsSorted(issue: { events?: IssueEvent[]; rangeEvents?: IssueEvent[] }): IssueEvent[] {
  const source =
    issue.rangeEvents && issue.rangeEvents.length > 0 ? issue.rangeEvents : issue.events || [];
  return source
    .filter((e) => e.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}
