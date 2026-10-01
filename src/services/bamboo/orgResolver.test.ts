import { describe, expect, it, vi } from 'vitest';
import {
  buildActiveNameIndex,
  buildFullTeamBySupervisorName,
  getAmbiguousNormalizedNames,
  getDirectReportsBySupervisorName,
  hasDirectorySupervisorData,
  mergeDirectoryIntoRoster,
  resolveOrganization,
} from './orgResolver';
import type { BambooClient, BambooEmployeeRecord } from './bambooClient';

function mockClient(
  roster: BambooEmployeeRecord[],
  options: {
    employeeDetails?: Record<string, Record<string, string>>;
    directory?: BambooEmployeeRecord[];
    restrictedFieldsByEmployee?: Record<string, string[]>;
    listFails?: boolean;
  } = {},
): BambooClient {
  const directory = options.directory ?? [];
  return {
    listAllEmployees: options.listFails
      ? vi.fn().mockRejectedValue(new Error('permission denied'))
      : vi.fn().mockResolvedValue({
          employees: roster,
          restrictedFieldsByEmployee: options.restrictedFieldsByEmployee || {},
          pages: 1,
        }),
    getDirectory: vi.fn().mockResolvedValue(directory),
    getEmployee: vi.fn().mockImplementation((id: string) =>
      Promise.resolve(options.employeeDetails?.[id] || {}),
    ),
  } as unknown as BambooClient;
}

const manager: BambooEmployeeRecord = {
  id: '1',
  displayName: 'Alice Manager',
  workEmail: 'alice@co.com',
  jobTitle: 'Design Lead',
  status: 'Active',
};

describe('resolveOrganization', () => {
  it('A. keeps supervisorEId logic as primary reporting source', async () => {
    const roster = [
      manager,
      {
        id: '2',
        displayName: 'Bob IC',
        workEmail: 'bob@co.com',
        supervisorEId: '1',
        jobTitle: 'Designer',
        status: 'Active',
      },
    ];
    const result = await resolveOrganization(mockClient(roster), 'alice@co.com');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('team');
    expect(result.reportingSource).toBe('id');
    expect(result.directReports).toHaveLength(1);
  });

  it('B. uses supervisorEmail when supervisorEId is unavailable', async () => {
    const roster = [
      { id: '1', displayName: 'Alice', workEmail: 'alice@co.com', status: 'Active' },
      {
        id: '2',
        displayName: 'Bob',
        workEmail: 'bob@co.com',
        supervisorEmail: 'alice@co.com',
        status: 'Active',
      },
    ];
    const result = await resolveOrganization(mockClient(roster), 'alice@co.com');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('team');
    expect(result.reportingSource).toBe('email');
    expect(result.directReports).toHaveLength(1);
  });

  it('C. falls back to Directory supervisor when list reporting fields are restricted', async () => {
    const roster = [
      {
        id: '1',
        displayName: 'Andrei Kuznetsov',
        workEmail: 'andrei@altenar.com',
        status: 'Active',
        _restrictedFields: ['supervisorEId', 'supervisorEmail'],
      },
      {
        id: '2',
        displayName: 'Designer A',
        workEmail: 'designer.a@altenar.com',
        status: 'Active',
        _restrictedFields: ['supervisorEId', 'supervisorEmail'],
      },
    ];
    const directory = [
      { id: '1', displayName: 'Andrei Kuznetsov', workEmail: 'andrei@altenar.com', status: 'Active' },
      {
        id: '2',
        displayName: 'Designer A',
        workEmail: 'designer.a@altenar.com',
        supervisor: 'Andrei Kuznetsov',
        status: 'Active',
      },
    ];
    const client = mockClient(roster, {
      directory,
      restrictedFieldsByEmployee: { '1': ['supervisorEId'], '2': ['supervisorEId'] },
    });
    const result = await resolveOrganization(client, 'andrei@altenar.com');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('team');
    expect(result.reportingSource).toBe('directory_supervisor');
    expect(result.directReports).toHaveLength(1);
  });

  it('D. detects direct reports via supervisor display name', async () => {
    const roster = [
      { id: '1', displayName: 'Manager', workEmail: 'mgr@co.com', status: 'Active' },
      { id: '2', displayName: 'Report', workEmail: 'rep@co.com', status: 'Active' },
    ];
    const directory = [
      { id: '1', displayName: 'Manager', workEmail: 'mgr@co.com', status: 'Active' },
      { id: '2', displayName: 'Report', workEmail: 'rep@co.com', supervisor: 'Manager', status: 'Active' },
    ];
    const result = await resolveOrganization(mockClient(roster, { directory }), 'mgr@co.com');
    expect(result.mode).toBe('team');
    expect(result.directReports[0]?.displayName).toBe('Report');
  });

  it('E. builds nested fullTeam through supervisor names', async () => {
    const roster = [
      { id: '1', displayName: 'Andrei', workEmail: 'andrei@co.com', status: 'Active' },
      { id: '2', displayName: 'Designer A', workEmail: 'a@co.com', status: 'Active' },
      { id: '3', displayName: 'Designer B', workEmail: 'b@co.com', status: 'Active' },
      { id: '4', displayName: 'Designer C', workEmail: 'c@co.com', status: 'Active' },
    ];
    const directory = [
      { id: '1', displayName: 'Andrei', workEmail: 'andrei@co.com', status: 'Active' },
      { id: '2', displayName: 'Designer A', workEmail: 'a@co.com', supervisor: 'Andrei', status: 'Active' },
      { id: '3', displayName: 'Designer B', workEmail: 'b@co.com', supervisor: 'Designer A', status: 'Active' },
      { id: '4', displayName: 'Designer C', workEmail: 'c@co.com', supervisor: 'Andrei', status: 'Active' },
    ];
    const result = await resolveOrganization(mockClient(roster, { directory }), 'andrei@co.com');
    expect(result.mode).toBe('team');
    expect(result.fullTeam.map((e) => e.displayName).sort()).toEqual(
      ['Designer A', 'Designer B', 'Designer C'].sort(),
    );
  });

  it('F. returns confident personal mode when directory has no reports', async () => {
    const roster = [
      { id: '1', displayName: 'Solo IC', workEmail: 'solo@co.com', status: 'Active' },
      { id: '2', displayName: 'Peer', workEmail: 'peer@co.com', status: 'Active' },
    ];
    const directory = [
      { id: '1', displayName: 'Solo IC', workEmail: 'solo@co.com', supervisor: 'Other Manager', status: 'Active' },
      { id: '2', displayName: 'Peer', workEmail: 'peer@co.com', supervisor: 'Other Manager', status: 'Active' },
    ];
    const result = await resolveOrganization(mockClient(roster, { directory }), 'solo@co.com');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('personal');
    expect(result.reportingSource).toBe('directory_supervisor');
    expect(result.directReports).toHaveLength(0);
  });

  it('G. refuses to guess when manager display names are ambiguous', async () => {
    const roster = [
      { id: '1', displayName: 'Andrei Kuznetsov', workEmail: 'andrei@altenar.com', status: 'Active' },
      { id: '10', displayName: 'Andrei Kuznetsov', workEmail: 'andrei2@altenar.com', status: 'Active' },
      { id: '2', displayName: 'Designer A', workEmail: 'a@altenar.com', status: 'Active' },
    ];
    const directory = [
      { id: '1', displayName: 'Andrei Kuznetsov', workEmail: 'andrei@altenar.com', status: 'Active' },
      { id: '10', displayName: 'Andrei Kuznetsov', workEmail: 'andrei2@altenar.com', status: 'Active' },
      { id: '2', displayName: 'Designer A', workEmail: 'a@altenar.com', supervisor: 'Andrei Kuznetsov', status: 'Active' },
    ];
    const result = await resolveOrganization(mockClient(roster, { directory }), 'andrei@altenar.com');
    expect(result.ok).toBe(false);
    expect(result.mode).toBe('unknown');
    expect(result.ambiguousSupervisorNames).toBeGreaterThan(0);
  });

  it('H. returns restricted when directory has no supervisor data', async () => {
    const roster = [
      { id: '1', displayName: 'Alice', workEmail: 'alice@co.com', status: 'Active' },
      { id: '2', displayName: 'Bob', workEmail: 'bob@co.com', status: 'Active' },
    ];
    const directory = [
      { id: '1', displayName: 'Alice', workEmail: 'alice@co.com', status: 'Active' },
      { id: '2', displayName: 'Bob', workEmail: 'bob@co.com', status: 'Active' },
    ];
    const client = mockClient(roster, {
      directory,
      restrictedFieldsByEmployee: { '1': ['supervisorEId'], '2': ['supervisorEId'] },
    });
    const result = await resolveOrganization(client, 'alice@co.com');
    expect(result.ok).toBe(false);
    expect(result.mode).toBe('unknown');
    expect(result.error).toContain('reporting structure');
  });

  it('I. resolves current employee strictly by exact work email', async () => {
    const roster = [
      { id: '1', displayName: 'Alice', workEmail: 'alice@co.com', status: 'Active' },
      { id: '2', displayName: 'Bob', workEmail: 'bob@co.com', status: 'Active' },
    ];
    const result = await resolveOrganization(mockClient(roster), 'bob@co.com');
    expect(result.employee?.workEmail).toBe('bob@co.com');
  });

  it('J. excludes inactive employees from directory reporting', async () => {
    const roster = [
      { id: '1', displayName: 'Manager', workEmail: 'mgr@co.com', status: 'Active' },
      { id: '2', displayName: 'Inactive Report', workEmail: 'old@co.com', status: 'Inactive' },
      { id: '3', displayName: 'Active Peer', workEmail: 'peer@co.com', status: 'Active' },
    ];
    const directory = [
      { id: '1', displayName: 'Manager', workEmail: 'mgr@co.com', status: 'Active' },
      { id: '2', displayName: 'Inactive Report', workEmail: 'old@co.com', supervisor: 'Manager', status: 'Inactive' },
      { id: '3', displayName: 'Active Peer', workEmail: 'peer@co.com', supervisor: 'Other Manager', status: 'Active' },
    ];
    const result = await resolveOrganization(mockClient(roster, { directory }), 'mgr@co.com');
    expect(result.directReports).toHaveLength(0);
    expect(result.mode).toBe('personal');
  });

  it('K. does not duplicate people after merging list and directory', async () => {
    const roster = [
      { id: '1', displayName: 'Manager', workEmail: 'mgr@co.com', status: 'Active' },
      { id: '2', displayName: 'A', workEmail: 'a@co.com', status: 'Active' },
      { id: '3', displayName: 'B', workEmail: 'b@co.com', status: 'Active' },
    ];
    const directory = [
      { id: '1', displayName: 'Manager', workEmail: 'mgr@co.com', status: 'Active' },
      { id: '2', displayName: 'A', workEmail: 'a@co.com', supervisor: 'Manager', status: 'Active' },
      { id: '3', displayName: 'B', workEmail: 'b@co.com', supervisor: 'Manager', status: 'Active' },
    ];
    const result = await resolveOrganization(mockClient(roster, { directory }), 'mgr@co.com');
    const ids = result.fullTeam.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.fullTeam).toHaveLength(2);
  });

  it('falls back to directory roster when list employees fails', async () => {
    const roster = [manager, { id: '2', displayName: 'Bob', workEmail: 'bob@co.com', supervisorEId: '1', status: 'Active' }];
    const result = await resolveOrganization(
      mockClient(roster, { listFails: true, directory: roster }),
      'alice@co.com',
    );
    expect(result.mode).toBe('team');
    expect(result.diagnostics.some((d) => d.includes('directory'))).toBe(true);
  });
});

describe('directory merge helpers', () => {
  it('merges supervisor by id and email', () => {
    const list = [{ id: '1', displayName: 'Alice', workEmail: 'alice@co.com', status: 'Active' }];
    const directory = [{ id: '1', displayName: 'Alice', workEmail: 'alice@co.com', supervisor: 'Boss', status: 'Active' }];
    const merged = mergeDirectoryIntoRoster(list, directory);
    expect(merged[0]?.supervisor).toBe('Boss');
    expect(hasDirectorySupervisorData(merged)).toBe(true);
  });

  it('normalizes supervisor names for direct report matching', () => {
    const employees = [
      { id: '1', displayName: 'Andrei Kuznetsov', status: 'Active' },
      { id: '2', displayName: 'Designer', supervisor: ' andrei   kuznetsov ', status: 'Active' },
    ];
    const ambiguous = getAmbiguousNormalizedNames(buildActiveNameIndex(employees));
    const reports = getDirectReportsBySupervisorName(employees, 'Andrei Kuznetsov', ambiguous);
    expect(reports).toHaveLength(1);
  });

  it('builds recursive full team without duplicates', () => {
    const employees = [
      { id: '1', displayName: 'Root', status: 'Active' },
      { id: '2', displayName: 'Child', supervisor: 'Root', status: 'Active' },
      { id: '3', displayName: 'Grandchild', supervisor: 'Child', status: 'Active' },
    ];
    const ambiguous = getAmbiguousNormalizedNames(buildActiveNameIndex(employees));
    const team = buildFullTeamBySupervisorName(employees, 'Root', ambiguous);
    expect(team.map((e) => e.id)).toEqual(['2', '3']);
  });
});
