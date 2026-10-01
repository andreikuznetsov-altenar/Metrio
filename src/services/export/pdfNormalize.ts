import type { PerformanceExportPayload, PdfSection } from './types';

function pdfCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) return '—';
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  return String(value);
}

function normalizeSection(section: PdfSection): PdfSection {
  return {
    ...section,
    title: pdfCell(section.title),
    subtitle: section.subtitle ? pdfCell(section.subtitle) : undefined,
    emptyText: section.emptyText ? pdfCell(section.emptyText) : undefined,
    rowHeaders: section.rowHeaders?.map((h) => pdfCell(h)),
    keyValues: section.keyValues?.map((row) => ({
      label: pdfCell(row.label),
      value: pdfCell(row.value),
    })),
    rows: section.rows?.map((row) => ({
      cells: row.cells.map((cell) => pdfCell(cell)),
    })),
  };
}

/** Ensures every value passed to @react-pdf/renderer Text is a safe string. */
export function normalizePerformanceExportPayload(payload: PerformanceExportPayload): PerformanceExportPayload {
  const { metadata } = payload;
  return {
    ...payload,
    reportTitle: pdfCell(payload.reportTitle),
    metadata: {
      reportRange: pdfCell(metadata.reportRange),
      generatedAt: pdfCell(metadata.generatedAt),
      timezone: pdfCell(metadata.timezone),
      timezoneOffset: pdfCell(metadata.timezoneOffset),
      teamScope: metadata.teamScope ? pdfCell(metadata.teamScope) : undefined,
      projects: metadata.projects ? pdfCell(metadata.projects) : undefined,
      targetReviewDays:
        typeof metadata.targetReviewDays === 'number' && Number.isFinite(metadata.targetReviewDays)
          ? metadata.targetReviewDays
          : 0,
      personName: metadata.personName ? pdfCell(metadata.personName) : undefined,
      workHistoryGrouping: metadata.workHistoryGrouping ? pdfCell(metadata.workHistoryGrouping) : undefined,
      historyCoverage: metadata.historyCoverage ? pdfCell(metadata.historyCoverage) : undefined,
    },
    sections: payload.sections.map(normalizeSection),
  };
}
