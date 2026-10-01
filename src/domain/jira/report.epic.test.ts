import { describe, expect, it, vi } from 'vitest';
import { resolveEpicInfo } from './report';

describe('resolveEpicInfo lazy fetch', () => {
  it('fetches parent epic when missing from cache', async () => {
    const cache: Record<string, unknown> = {};
    const fetchIssueByKey = vi.fn().mockResolvedValue({
      key: 'EPIC-1',
      fields: {
        issuetype: { name: 'Epic' },
        summary: 'Parent epic',
      },
    });

    const issue = {
      key: 'TASK-1',
      fields: {
        issuetype: { name: 'Task' },
        parent: { key: 'EPIC-1', fields: { summary: 'Partial' } },
      },
    };

    const epic = await resolveEpicInfo(issue, cache, fetchIssueByKey);
    expect(fetchIssueByKey).toHaveBeenCalledOnce();
    expect(fetchIssueByKey).toHaveBeenCalledWith('EPIC-1');
    expect(epic?.key).toBe('EPIC-1');
    expect(cache['EPIC-1']).toBeTruthy();
  });

  it('uses cache on second call', async () => {
    const cache: Record<string, unknown> = {};
    const fetchIssueByKey = vi.fn().mockResolvedValue({
      key: 'EPIC-2',
      fields: { issuetype: { name: 'Epic' }, summary: 'Cached epic' },
    });

    const issue = {
      key: 'TASK-2',
      fields: {
        issuetype: { name: 'Story' },
        parent: { key: 'EPIC-2' },
      },
    };

    await resolveEpicInfo(issue, cache, fetchIssueByKey);
    await resolveEpicInfo(issue, cache, fetchIssueByKey);
    expect(fetchIssueByKey).toHaveBeenCalledOnce();
  });
});
