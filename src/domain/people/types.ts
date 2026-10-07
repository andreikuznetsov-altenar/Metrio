import type { ResolvedEmployee } from '../../services/bamboo/orgResolver';
import type { KpiData } from '../jira/types';
import type { WorkloadResult } from '../workload/workloadEngine';
import type { AuditIssue } from '../jira/types';

export type AvailabilityState =
  | 'available'
  | 'vacation_soon'
  | 'vacation_tomorrow'
  | 'on_vacation'
  | 'returns_today';

export interface PersonAvailability {
  state: AvailabilityState;
  label: string;
  startDate?: string;
  endDate?: string;
  returnDate?: string;
  isHoliday: boolean;
}

export interface PersonJiraIdentity {
  accountId: string;
  displayName: string;
  email: string;
  canonicalKey: string;
}

export interface PersonIdentityDiagnostics {
  matchedBy: 'email' | 'accountId' | 'displayName' | 'unresolved';
  warnings: string[];
}

export interface Person {
  id: string;
  bamboo: ResolvedEmployee;
  jira: PersonJiraIdentity | null;
  identity: PersonIdentityDiagnostics;
  availability: PersonAvailability;
  /** Personal Jira workload — only issues currently assigned to this person. */
  personalWorkload?: WorkloadResult | null;
  workload: WorkloadResult | null;
  performance: KpiData | null;
  /** Historically attributed issues for KPI / work history. */
  issues: AuditIssue[];
  /** Subset currently assigned to this person in Jira. */
  ownedIssues: AuditIssue[];
}

export interface TeamSnapshot {
  persons: Person[];
  mode: 'team' | 'personal' | 'personal_limited' | 'unknown';
  summary: {
    available: number;
    onVacation: number;
    vacationSoon: number;
    highWorkload: number;
    problematic: number;
  };
}
