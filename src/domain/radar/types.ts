import type { AuditIssue } from '../jira/types';
import type { TaskHealthReasonCode, TaskHealthStatus } from '../task-health/taskHealthEngine';
import type { TimedStageKind } from '../task-health/stageAttentionTargets';

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
  /** Task Health reason behind the risk (structured — never parse `reason` text). */
  reasonCode: TaskHealthReasonCode;
  /** Task Health status of the issue ("problematic", "at_risk", …). */
  healthStatus: TaskHealthStatus;
  /** Timed stage the task currently sits in (or 'hold'), when known. */
  stageKind: TimedStageKind | 'hold' | null;
  /** Delivery Risk rule that set the severity (C1..C3, W1..W6, I1). */
  rule: string;
  issue: AuditIssue;
}
