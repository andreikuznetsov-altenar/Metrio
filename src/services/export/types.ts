export type PerformanceExportView =
  | 'team-overview'
  | 'team-radar'
  | 'team-people'
  | 'team-delivery-risk'
  | 'personal-my-week'
  | 'personal-trends'
  | 'personal-work-history';

export interface PdfKeyValue {
  label: string;
  value: string;
}

export interface PdfTableRow {
  cells: string[];
}

export interface PdfSection {
  title: string;
  subtitle?: string;
  emptyText?: string;
  keyValues?: PdfKeyValue[];
  rows?: PdfTableRow[];
  rowHeaders?: string[];
}

export interface ReportRangeIso {
  from: string;
  to: string;
}

export interface PdfKpiTeaser {
  label: string;
  value: string;
  description?: string;
  comparison?: string;
}

export interface PdfDigestTable {
  title: string;
  rows: { label: string; value: string }[];
}

export interface PdfAttentionRow {
  personId: string;
  personName: string;
  bambooEmployeeId?: string;
  attention: string;
  issues: string;
  severity: string;
  workload: string;
  avatarDataUrl?: string | null;
}

export interface PdfTrendBlock {
  label: string;
  value: string;
  comparison?: string;
  chartPoints: { date: string; value: number }[];
}

export interface PdfWorkloadRow {
  personName: string;
  active: string;
  atRisk: string;
  workload: string;
}

export interface TeamPerformancePdfLayout {
  companyLogoSrc: string;
  companyLogoSource: string;
  reportRange: ReportRangeIso;
  reportRangeTitle: string;
  kpiOverview: PdfKpiTeaser[];
  digestSummary: string;
  digestAttention: PdfDigestTable;
  digestRecentChanges: PdfDigestTable;
  teamAttention: {
    rows: PdfAttentionRow[];
    subtitle?: string;
  };
  teamTrends: PdfTrendBlock[];
  workloadBalance: {
    subtitle?: string;
    rows: PdfWorkloadRow[];
  };
}

export interface PerformanceExportPayload {
  view: PerformanceExportView;
  reportTitle: string;
  reportRange?: ReportRangeIso;
  teamLayout?: TeamPerformancePdfLayout;
  metadata: {
    reportRange: string;
    generatedAt: string;
    timezone: string;
    timezoneOffset: string;
    teamScope?: string;
    projects?: string;
    targetReviewDays: number;
    personName?: string;
    workHistoryGrouping?: string;
    historyCoverage?: string;
  };
  sections: PdfSection[];
}
