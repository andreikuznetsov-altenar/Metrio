import type { PerformanceExportView } from './types';

const VIEW_SLUGS: Record<PerformanceExportView, string> = {
  'team-overview': 'Team-Performance',
  'team-radar': 'Team-Radar',
  'team-people': 'Team-People',
  'team-delivery-risk': 'Delivery-Risk',
  'personal-my-week': 'My-Week',
  'personal-trends': 'My-Trends',
  'personal-work-history': 'Work-History',
};

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function buildPdfFilename(
  view: PerformanceExportView,
  options?: { date?: Date; dateFrom?: string; dateTo?: string },
): string {
  const date = options?.date ?? new Date();
  if (view === 'team-overview' && options?.dateFrom && options?.dateTo) {
    const from = sanitizeFilenamePart(options.dateFrom);
    const to = sanitizeFilenamePart(options.dateTo);
    return `Team_Performance_Report_${from}_to_${to}.pdf`;
  }
  const slug = VIEW_SLUGS[view];
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `Metrio-${slug}-${yyyy}-${mm}-${dd}.pdf`;
}

export function resolveExportView(
  performanceTab: string,
  isTeamMode: boolean,
): PerformanceExportView | null {
  if (isTeamMode) {
    if (performanceTab === 'overview') return 'team-overview';
    if (performanceTab === 'radar') return 'team-radar';
    if (performanceTab === 'people') return 'team-people';
    if (performanceTab === 'delivery-risk') return 'team-delivery-risk';
    return null;
  }
  if (performanceTab === 'my-week') return 'personal-my-week';
  if (performanceTab === 'trends') return 'personal-trends';
  if (performanceTab === 'work-history') return 'personal-work-history';
  return null;
}

export function canExportPerformanceReport(input: {
  reportData: unknown;
  reportLoading: boolean;
  exporting: boolean;
  needsSetup: boolean;
  view: PerformanceExportView | null;
}): boolean {
  return !!input.reportData && !input.reportLoading && !input.exporting && !input.needsSetup && !!input.view;
}
