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

function minimalTeamLayout(
  overrides: Partial<import('./types').TeamPerformancePdfLayout> = {},
): import('./types').TeamPerformancePdfLayout {
  return {
    companyLogoSrc: '',
    companyLogoSource: 'test',
    useVectorLogo: true,
    teamName: 'UX Design',
    reportRange: { from: '2026-07-09', to: '2026-10-09' },
    reportRangeTitle: '9 Jul 2026 — 9 Oct 2026',
    roster: [{ personId: 'p1', name: 'Andrei Kuznetsov', jobTitle: 'Head of UX Design' }],
    teamEfficiency: {
      hero: { label: 'Efficiency', value: '91%', description: 'Healthy' },
      supporting: [
        { label: 'First pass', value: '84%' },
        { label: 'Completed', value: '25' },
        { label: 'Backflows', value: '4' },
      ],
    },
    individualEfficiency: [],
    digestSummary: 'Selected period summary.',
    digestRecentChanges: { title: 'Recent changes', rows: [{ label: 'Completed', value: '-17' }] },
    teamTrends: [],
    workloadBalance: { rows: [] },
    deliveryRiskDetails: {
      subtitle: 'Current delivery risks',
      rows: [],
      overflowLabel: null,
    },
    ...overrides,
  };
}

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

  it('team layout survives incompatible SVG logo and avatar (wordmark/initials fallback)', async () => {
    const badSvg = `<svg xmlns="http://www.w3.org/2000/svg"><text font-family="Helvetica, Arial, sans-serif" font-weight="700">Altenar</text></svg>`;
    const badLogo = `data:image/svg+xml;base64,${Buffer.from(badSvg).toString('base64')}`;
    const payload = {
      ...payloadFor('team-overview'),
      sections: [],
      reportRange: { from: '2026-07-09', to: '2026-10-09' },
      teamLayout: minimalTeamLayout({
        companyLogoSrc: badLogo,
        companyLogoSource: 'test-incompatible',
        useVectorLogo: true,
        teamTrends: [
          {
            label: 'Completed',
            value: '25',
            chartPoints: [
              { date: '2026-07-09', value: 2 },
              { date: '2026-08-09', value: 4 },
              { date: '2026-10-09', value: 6 },
            ],
          },
        ],
        workloadBalance: {
          rows: [
            {
              personId: 'p1',
              personName: 'Sam',
              active: '1',
              atRisk: '0',
              workload: 'Light',
            },
          ],
        },
      }),
    };
    const bytes = await renderPerformancePdfBytes(payload);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('%PDF');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('team layout renders with compatible bundled-style Altenar SVG logo', async () => {
    const okSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40"><text font-size="28" fill="#0B3D2E">Altenar</text></svg>`;
    const okLogo = `data:image/svg+xml;base64,${Buffer.from(okSvg).toString('base64')}`;
    const payload = {
      ...payloadFor('team-overview'),
      sections: [],
      teamLayout: minimalTeamLayout({
        companyLogoSrc: okLogo,
        companyLogoSource: 'bundled-test',
        useVectorLogo: false,
      }),
    };
    const bytes = await renderPerformancePdfBytes(payload);
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
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'write_user_selected_pdf') {
        return { path: '/Users/test/Desktop/out.pdf' };
      }
      if (command === 'report_history_archive') {
        return {
          id: 'report-1',
          createdAt: '2026-10-07T15:02:00.000Z',
          filename: 'Metrio_Report_2026-10-07_15-02.pdf',
          storageName: 'Metrio_Report_2026-10-07_15-02.pdf',
        };
      }
      throw new Error(`unexpected invoke ${command}`);
    });
    const { exportPerformancePdf } = await import('./pdfExport');
    const result = await exportPerformancePdf(payloadFor('team-overview'));
    expect(result).toEqual({ status: 'saved', path: '/Users/test/Desktop/out.pdf' });
    expect(invoke).toHaveBeenCalledWith(
      'report_history_archive',
      expect.objectContaining({ filename: expect.stringContaining('Metrio_Report_') }),
    );
  });

  it('rejects concurrent export invocations', async () => {
    const { save } = await import('@tauri-apps/plugin-dialog');
    vi.mocked(save).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('/Users/test/Desktop/out.pdf'), 50);
        }),
    );
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue({ path: '/Users/test/Desktop/out.pdf' });
    const { exportPerformancePdf } = await import('./pdfExport');
    const payload = payloadFor('team-overview');
    const first = exportPerformancePdf(payload);
    const second = await exportPerformancePdf(payload);
    expect(second).toEqual({ status: 'busy' });
    await first;
  });

  it('opens saved pdf via native opener command', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'open_exported_pdf') {
        return undefined;
      }
      throw new Error(`unexpected invoke ${command}`);
    });
    const { openExportedPdf } = await import('./pdfExport');
    const result = await openExportedPdf('/Users/test/Desktop/out.pdf');
    expect(invoke).toHaveBeenCalledWith('open_exported_pdf', {
      path: '/Users/test/Desktop/out.pdf',
    });
    expect(result).toEqual({ status: 'opened' });
  });

  it('opens paths containing spaces via native opener command', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { openExportedPdf } = await import('./pdfExport');
    const spaced = '/Users/test/Documents/11. Altenar/out.pdf';
    const result = await openExportedPdf(spaced);
    expect(invoke).toHaveBeenCalledWith('open_exported_pdf', { path: spaced });
    expect(result).toEqual({ status: 'opened' });
  });
});
