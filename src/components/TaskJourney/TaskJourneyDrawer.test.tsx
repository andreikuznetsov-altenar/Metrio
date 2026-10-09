import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuditIssue } from '../../domain/jira/types';
import { DEFAULT_OPERATIONAL_RULES } from '../../domain/operationalRules/operationalRulesDefaults';
import { TaskJourneyDrawer } from './TaskJourneyDrawer';

vi.mock('../../platform/preferences', () => ({
  loadPreferences: vi.fn(async () => ({ jira: { baseUrl: 'https://jira.example.com' } })),
}));

const openPerson = vi.fn();

vi.mock('../../app/PersonNavigationContext', () => ({
  useOptionalPersonNavigation: () => ({ openPerson, registerPersonDrawerHandler: vi.fn() }),
}));

const issue: AuditIssue = {
  issueKey: 'UX-99',
  issueSummary: 'Stuck review task',
  issueCreated: '2026-09-01T09:00:00.000Z',
  assigneeName: 'Daria Chernova',
  currentAssigneeCanonical: 'daria',
  currentAssigneeDisplayName: 'Daria Chernova',
  issueTypeName: 'Task',
  contentType: 'none',
  designImprovementType: '',
  epicKey: '',
  epicSummary: '',
  epicStatus: '',
  epicContentType: '',
  epicDesignImprovementType: '',
  events: [
    {
      eventType: 'Status',
      changedAt: '2026-09-20T09:00:00.000Z',
      changedBy: 'User',
      fromValue: 'In Progress',
      toValue: 'In Review',
      timeSincePreviousStatusMs: 86400000,
      isBackflow: false,
      isHandoff: false,
      isReturnToTeam: false,
      excludeFromEfficiencyBackflow: false,
    },
  ],
  rangeEvents: [],
  currentStatus: 'In Review',
};

const persons = [
  {
    id: 'daria-id',
    bamboo: {
      id: 'daria-id',
      displayName: 'Daria Chernova',
      firstName: 'Daria',
      lastName: 'Chernova',
      workEmail: 'daria@co.com',
      jobTitle: 'Engineer',
      status: 'Active',
    },
    jira: {
      accountId: 'jira-daria',
      displayName: 'Daria Chernova',
      email: 'daria@co.com',
      canonicalKey: 'daria',
    },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    ownedIssues: [issue],
    issues: [issue],
  },
];

describe('TaskJourneyDrawer', () => {
  it('shows status badge, prominent stage duration, and diagnostic block', async () => {
    const user = userEvent.setup();
    render(
      <TaskJourneyDrawer
        open
        issue={issue}
        params={{
          dateFrom: '2026-07-01',
          dateTo: '2026-10-09',
          targetReviewDays: 18,
          users: [],
          projects: ['UX'],
        }}
        rules={DEFAULT_OPERATIONAL_RULES}
        persons={persons}
        onClose={() => undefined}
      />,
    );

    expect(
      within(screen.getByTestId('task-journey-drawer')).getByText('In Review'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Current status:/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('task-journey-stage-duration')).toBeInTheDocument();
    expect(screen.getByTestId('task-journey-diagnostic-block')).toBeInTheDocument();

    const ownerButtons = screen.getAllByRole('button', { name: 'Daria Chernova' });
    await user.click(ownerButtons[0]);
    expect(openPerson).toHaveBeenCalledWith('daria-id');
  });
});
