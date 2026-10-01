import { describe, expect, it } from 'vitest';
import { buildDeliveryRiskItems } from './deliveryRisk';
import type { TeamSnapshot } from '../people/types';
import type { ReportParams } from '../jira/types';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function issue(key: string, status: string) {
  return {
    issueKey: key,
    issueSummary: 'Summary',
    issueCreated: '2026-01-01T00:00:00.000Z',
    assigneeName: 'Anna',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events: [],
    rangeEvents: [],
    currentStatus: status,
  };
}

describe('buildDeliveryRiskItems', () => {
  it('includes blocked tasks', () => {
    const snapshot: TeamSnapshot = {
      mode: 'team',
      summary: { available: 1, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
      persons: [
        {
          id: '1',
          bamboo: {
            id: '1',
            displayName: 'Anna',
            firstName: 'Anna',
            lastName: '',
            workEmail: 'a@co.com',
            jobTitle: '',
            status: 'Active',
          },
          jira: { accountId: '1', displayName: 'Anna', email: 'a@co.com', canonicalKey: '1' },
          identity: { matchedBy: 'email', warnings: [] },
          availability: { state: 'available', label: 'Available', isHoliday: false },
          workload: null,
          performance: null,
          issues: [issue('PROJ-1', 'On Hold')],
        },
      ],
    };
    const items = buildDeliveryRiskItems(snapshot, params);
    expect(items.some((i) => i.issueKey === 'PROJ-1')).toBe(true);
  });
});
