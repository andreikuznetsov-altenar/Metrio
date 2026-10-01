import { describe, expect, it } from 'vitest';
import { normalizePerformanceExportPayload } from './pdfNormalize';
import type { PerformanceExportPayload } from './types';

const base: PerformanceExportPayload = {
  view: 'team-overview',
  reportTitle: 'Team Performance Report',
  metadata: {
    reportRange: '01/03/2026 - 29/03/2026',
    generatedAt: '25/09/2026 12:00',
    timezone: 'UTC',
    timezoneOffset: '+00:00',
    targetReviewDays: 3,
  },
  sections: [
    {
      title: 'KPI',
      keyValues: [{ label: 'Efficiency', value: undefined as unknown as string }],
      rows: [{ cells: [undefined as unknown as string, NaN as unknown as string, 'ok'] }],
    },
  ],
};

describe('normalizePerformanceExportPayload', () => {
  it('coerces unsafe cell values to strings', () => {
    const normalized = normalizePerformanceExportPayload(base);
    expect(normalized.sections[0].keyValues![0].value).toBe('—');
    expect(normalized.sections[0].rows![0].cells).toEqual(['—', '—', 'ok']);
  });
});
