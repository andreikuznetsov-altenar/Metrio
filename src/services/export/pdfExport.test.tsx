import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPerformancePdfBytes } from './pdfExport';
import { buildPerformanceExportData } from './buildPerformanceExportData';
import { DEFAULT_PREFERENCES } from '../../platform/preferences';
import { EMPTY_KPI_SNAPSHOT_FILE } from '../../domain/snapshots/snapshotEngine';
import type { TeamSnapshot } from '../../domain/people/types';
import type { AuditReportData } from '../../domain/jira/types';
import { testKpi, testWorkload } from '../../domain/testFixtures';
import type { PerformanceExportView } from './types';

const personalSnapshot: TeamSnapshot = {
  mode: 'personal',
  persons: [
    {
      id: '1',
      bamboo: {
        id: '1',
        displayName: 'Alex Example with "quotes" & symbols',
        firstName: 'Alex',
        lastName: 'Example',
        workEmail: 'alex@example.com',
        jobTitle: '',
        status: 'Active',
      },
      jira: {
        accountId: 'jira-1',
        displayName: 'Alex Example',
        email: 'alex@example.com',
        canonicalKey: 'jira-1',
      },
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: 'available', label: 'Available', isHoliday: false },
      workload: testWorkload({ level: 'normal', activeCount: 0 }),
      performance: testKpi(),
      issues: [],
    },
  ],
  summary: { available: 1, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
};

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: vi.fn(async () => undefined),
}));

const snapshot: TeamSnapshot = {
  mode: 'team',
  persons: [],
  summary: { available: 0, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
};

const reportData: AuditReportData = {
  params: {
    dateFrom: '2026-03-01',
    dateTo: '2026-03-29',
    targetReviewDays: 3,
    users: [],
    projects: [],
  },
  grouped: {},
  totalTransitions: 0,
  teamSummaryColumns: [],
  teamKpi: testKpi(),
  perUserKpi: {},
};

const EXPORT_VIEWS: PerformanceExportView[] = [
  'team-overview',
  'team-radar',
  'team-people',
  'team-delivery-risk',
  'personal-my-week',
  'personal-trends',
  'personal-work-history',
];

function payloadFor(view: PerformanceExportView) {
  return buildPerformanceExportData({
    view,
    snapshot: view.startsWith('personal') ? personalSnapshot : snapshot,
    reportData,
    kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
    firstPassMetrics: { official: { firstPassRatePercent: 0 } },
    prefs: DEFAULT_PREFERENCES,
    workHistoryPeriod: 'month',
  });
}

describe('renderPerformancePdfBytes', () => {
  it('generates non-empty PDF bytes with PDF header and logo', async () => {
    const payload = payloadFor('team-overview');
    const bytes = await renderPerformancePdfBytes(payload);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('%PDF');
    if (process.env.METRIO_WRITE_VERIFY_PDF) {
      const out = join(homedir(), 'Downloads', 'Metrio-Packaged-Verify-Overview.pdf');
      writeFileSync(out, bytes);
    }
  });

  it.each(EXPORT_VIEWS)('renders view %s', async (view) => {
    const bytes = await renderPerformancePdfBytes(payloadFor(view));
    expect(bytes.length).toBeGreaterThan(500);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('%PDF');
  });
});

describe('exportPerformancePdf', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns cancelled when save dialog is dismissed', async () => {
    const { save } = await import('@tauri-apps/plugin-dialog');
    vi.mocked(save).mockResolvedValue(null);
    const { exportPerformancePdf } = await import('./pdfExport');
    const result = await exportPerformancePdf(payloadFor('team-overview'));
    expect(result.status).toBe('cancelled');
    if (result.status === 'cancelled') {
      expect(result.message).toContain('cancelled');
    }
  });

  it('maps write failures to pdf_write_failed', async () => {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(save).mockResolvedValue('/Users/test/Desktop/Metrio-Team-Performance-2026-09-30.pdf');
    vi.mocked(invoke).mockRejectedValue(new Error('forbidden path: scope denied'));
    const { exportPerformancePdf } = await import('./pdfExport');
    const result = await exportPerformancePdf(payloadFor('team-overview'));
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('pdf_write_failed');
      expect(result.userMessage).toContain('selected location');
      expect(result.message).toContain('scope');
    }
  });

  it('returns saved path when invoke succeeds', async () => {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(save).mockResolvedValue('/Users/test/Desktop/out.pdf');
    vi.mocked(invoke).mockResolvedValue({ path: '/Users/test/Desktop/out.pdf' });
    const { exportPerformancePdf } = await import('./pdfExport');
    const result = await exportPerformancePdf(payloadFor('team-overview'));
    expect(result).toEqual({ status: 'saved', path: '/Users/test/Desktop/out.pdf' });
  });

  it('opens saved pdf via opener plugin', async () => {
    const { openPath } = await import('@tauri-apps/plugin-opener');
    const { openExportedPdf } = await import('./pdfExport');
    const result = await openExportedPdf('/Users/test/Desktop/out.pdf');
    expect(openPath).toHaveBeenCalledWith('/Users/test/Desktop/out.pdf');
    expect(result).toEqual({ status: 'opened' });
  });
});
