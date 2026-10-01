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

export interface PerformanceExportPayload {
  view: PerformanceExportView;
  reportTitle: string;
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
