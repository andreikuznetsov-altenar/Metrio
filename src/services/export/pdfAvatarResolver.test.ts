import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TeamSnapshot } from '../../domain/people/types';
import { resolvePdfAvatarDataUrls } from './pdfAvatarResolver';

const mocks = vi.hoisted(() => ({
  fetchEmployeeAvatarDataUrl: vi.fn(),
  resolveAvatarSubdomain: vi.fn(),
}));

vi.mock('../bamboo/bambooAvatarService', () => ({
  fetchEmployeeAvatarDataUrl: mocks.fetchEmployeeAvatarDataUrl,
  resolveAvatarSubdomain: mocks.resolveAvatarSubdomain,
}));

function snapshot(): TeamSnapshot {
  const names = [
    ['andrei', '100', 'Andrei Kuznetsov'],
    ['daria', '101', 'Daria Chernova'],
    ['valeriia', '102', 'Valeriia Pavlova'],
    ['nikita', '103', 'Nikita Example'],
    ['konstantin', '104', 'Konstantin Example'],
  ];
  return {
    mode: 'team',
    persons: names.map(([id, bambooId, displayName]) => ({
      id,
      bamboo: {
        id: bambooId,
        displayName,
        firstName: displayName.split(' ')[0] ?? displayName,
        lastName: displayName.split(' ')[1] ?? '',
        workEmail: `${id}@example.com`,
        jobTitle: 'Designer',
        status: 'Active',
      },
      jira: null,
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: 'available', label: 'Available', isHoliday: false },
      workload: null,
      performance: null,
      issues: [],
      ownedIssues: [],
    })),
    summary: { available: 5, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
  };
}

describe('resolvePdfAvatarDataUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAvatarSubdomain.mockResolvedValue('altenar');
    mocks.fetchEmployeeAvatarDataUrl.mockImplementation(async (employeeId: string) =>
      employeeId === '103' ? null : `data:image/png;base64,${employeeId}`,
    );
  });

  it('resolves real Bamboo/app avatars before PDF render and falls back per person', async () => {
    const result = await resolvePdfAvatarDataUrls(snapshot(), [
      'andrei',
      'daria',
      'valeriia',
      'nikita',
      'konstantin',
    ]);

    expect(mocks.fetchEmployeeAvatarDataUrl).toHaveBeenCalledWith('100', 'altenar', 'medium');
    expect(mocks.fetchEmployeeAvatarDataUrl).toHaveBeenCalledWith('104', 'altenar', 'medium');
    expect(result.andrei).toBe('data:image/png;base64,100');
    expect(result.daria).toBe('data:image/png;base64,101');
    expect(result.valeriia).toBe('data:image/png;base64,102');
    expect(result.nikita).toBeNull();
    expect(result.konstantin).toBe('data:image/png;base64,104');
  });

  it('uses initials fallback data when the Bamboo subdomain is unavailable', async () => {
    mocks.resolveAvatarSubdomain.mockResolvedValue(null);
    const result = await resolvePdfAvatarDataUrls(snapshot(), ['andrei']);
    expect(mocks.fetchEmployeeAvatarDataUrl).not.toHaveBeenCalled();
    expect(result.andrei).toBeNull();
  });
});
