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

export function buildPdfFilename(view: PerformanceExportView, date = new Date()): string {
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
