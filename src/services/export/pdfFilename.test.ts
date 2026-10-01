import { describe, expect, it } from 'vitest';
import { buildPdfFilename, canExportPerformanceReport, resolveExportView } from './pdfFilename';

describe('resolveExportView', () => {
  it('maps team tabs', () => {
    expect(resolveExportView('overview', true)).toBe('team-overview');
    expect(resolveExportView('delivery-risk', true)).toBe('team-delivery-risk');
  });

  it('maps personal tabs', () => {
    expect(resolveExportView('my-week', false)).toBe('personal-my-week');
    expect(resolveExportView('work-history', false)).toBe('personal-work-history');
  });
});

describe('buildPdfFilename', () => {
  it('builds deterministic filename without spaces', () => {
    const name = buildPdfFilename('team-overview', new Date('2026-09-25T12:00:00'));
    expect(name).toBe('Metrio-Team-Performance-2026-09-25.pdf');
  });
});

describe('canExportPerformanceReport', () => {
  it('is disabled without report data', () => {
    expect(
      canExportPerformanceReport({
        reportData: null,
        reportLoading: false,
        exporting: false,
        needsSetup: false,
        view: 'team-overview',
      }),
    ).toBe(false);
  });

  it('is disabled while refreshing', () => {
    expect(
      canExportPerformanceReport({
        reportData: {},
        reportLoading: true,
        exporting: false,
        needsSetup: false,
        view: 'team-overview',
      }),
    ).toBe(false);
  });

  it('is enabled with stable report data', () => {
    expect(
      canExportPerformanceReport({
        reportData: {},
        reportLoading: false,
        exporting: false,
        needsSetup: false,
        view: 'team-overview',
      }),
    ).toBe(true);
  });
});
