export interface ReportParams {
  dateFrom: string;
  dateTo: string;
  targetReviewDays: number;
  users: string[];
  projects: string[];
  teamScope?: 'full' | 'direct';
}

export interface TeamUser {
  canonical: string;
  inputUser: string;
  email: string;
  displayName: string;
  accountId: string;
}

export interface TeamIdentityIndex {
  identifierToCanonical: Record<string, string>;
  canonicalToLabel: Record<string, string>;
}

export interface IssueEvent {
  eventType: 'Status' | 'Assignee';
  changedAt: string;
  changedBy: string;
  fromValue: string;
  toValue: string;
  timeSincePreviousStatusMs: number | null;
  isBackflow: boolean;
  isHandoff: boolean;
  isReturnToTeam: boolean;
  excludeFromEfficiencyBackflow: boolean;
}

export interface CycleSegment {
  type: 'progress_to_review' | 'progress_to_hold' | 'review_to_done';
  ms: number | null;
  startedAt: string;
  endedAt: string;
  hasBackflow: boolean;
  cycleTodoStartedAt: string | null;
  cycleWentToProgress?: boolean;
  cycleWentToReview?: boolean;
  fullCycleMs?: number | null;
  isCompleteCycle: boolean;
}

export interface CompletedCycle {
  progressToReview: CycleSegment | null;
  progressToHolds: CycleSegment[];
  reviewToDone: CycleSegment;
  hasBackflow: boolean;
  isFirstPass: boolean;
}

export interface AuditIssue {
  issueKey: string;
  issueSummary: string;
  issueCreated: string;
  assigneeName: string;
  issueTypeName: string;
  contentType: string;
  designImprovementType: string;
  epicKey: string;
  epicSummary: string;
  epicStatus: string;
  epicContentType: string;
  epicDesignImprovementType: string;
  events: IssueEvent[];
  rangeEvents: IssueEvent[];
  currentStatus?: string;
}

export interface KpiData {
  startedCount: number;
  reviewSubmittedCount: number;
  completedCount: number;
  firstPassAcceptedCount: number;
  holdCount: number;
  backflowCount: number;
  avgProgressToReviewMs: number | null;
  avgReviewToDoneMs: number | null;
  avgProgressToHoldMs: number | null;
  avgTodoToApprovedMs: number | null;
  targetReviewDays: number;
  efficiencyIndex: number;
}

export interface GroupedUserBlock {
  requestedUser: string;
  userLabel: string;
  issues: AuditIssue[];
  transitionStats: Record<string, number>;
}

export interface AuditReportData {
  grouped: Record<string, GroupedUserBlock>;
  totalTransitions: number;
  teamSummaryColumns: string[];
  teamKpi: KpiData;
  perUserKpi: Record<string, KpiData>;
  params: ReportParams;
}
