import type { AuditIssue } from '../jira/types';

export type RadarSeverity = 'critical' | 'warning' | 'info';

export type RadarPrimaryAction = 'view_person' | 'review_workload' | 'review_tasks';

export interface RadarSignal {
  id: string;
  severity: RadarSeverity;
  label: string;
  issueKey?: string;
  issueSummary?: string;
}

export interface TeamRadarItem {
  personId: string;
  personName: string;
  personRouteKey: string;
  severity: RadarSeverity;
  signals: RadarSignal[];
  relatedIssueKeys: string[];
  primaryAction: RadarPrimaryAction;
  signalCount: number;
}

export interface DeliveryRiskItem {
  issueKey: string;
  summary: string;
  personId: string;
  personName: string;
  personRouteKey: string;
  status: string;
  health: string;
  stageLabel: string;
  reason: string;
  severity: RadarSeverity;
  issue: AuditIssue;
}
