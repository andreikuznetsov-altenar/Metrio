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
  /** Canonical team identities for assignee events when resolvable. */
  fromCanonical?: string;
  toCanonical?: string;
  timeSincePreviousStatusMs: number | null;
  isBackflow: boolean;
  isHandoff: boolean;
  isReturnToTeam: boolean;
  excludeFromBackflow: boolean;
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
  projectKey?: string;
  projectName?: string;
  issueTypeId?: string;
  isSubtask?: boolean;
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
  /** Canonical team member key for current Jira assignee (fields.assignee). */
  currentAssigneeCanonical?: string;
  currentAssigneeAccountId?: string;
  currentAssigneeDisplayName?: string;
  /** Jira `duedate` (yyyy-MM-dd) when set. Scheduling hint only. */
  dueDate?: string;
  /** Jira `timeoriginalestimate` converted to hours, when the team sets it (never parsed from text). */
  originalEstimateHours?: number;
  /** Jira `timeestimate` (remaining estimate) in hours, when set. */
  remainingEstimateHours?: number;
}

export interface KpiData {
  /** Canonical performance methodology. Persisted snapshots with another version are rebuilt. */
  methodologyVersion?: 2;
  /** Cycles entering contributor execution during the reporting window. */
  startedCount: number;
  reviewSubmittedCount: number;
  /** Successful completion cycles ending during the reporting window. */
  completedCount: number;
  firstPassAcceptedCount: number;
  /** Completed cycles that needed at least one qualifying backflow (complement of First Pass). */
  reworkedCycleCount: number;
  /** Qualifying backward transitions occurring during the reporting window. */
  backflowEventCount: number;
  holdCount: number;
  firstPassRatePercent?: number | null;
  reworkRatePercent?: number | null;
  /** Raw successful work units completed in the selected reporting period. */
  throughputCount?: number;
  throughputPerWorkingDay?: number;
  medianExecutionMs?: number | null;
  meanExecutionMs?: number | null;
  executionSampleCount?: number;
  medianCycleMs?: number | null;
  meanCycleMs?: number | null;
  cycleSampleCount?: number;
  medianReviewMs?: number | null;
  meanReviewMs?: number | null;
  reviewSampleCount?: number;
  medianReworkMs?: number | null;
  meanReworkMs?: number | null;
  reworkDurationSampleCount?: number;
  medianHoldMs?: number | null;
  holdDurationSampleCount?: number;
  medianWaitingMs?: number | null;
  waitingDurationSampleCount?: number;
  /** Profiles represented by completed cycles; durations remain inspectable by profile. */
  profileBreakdown?: Record<string, {
    label: string;
    startedCount: number;
    completedCount: number;
    firstPassCount: number;
    reworkedCycleCount: number;
    backflowEventCount: number;
    medianExecutionMs: number | null;
    medianCycleMs: number | null;
    sampleCount: number;
  }>;
  avgProgressToReviewMs: number | null;
  avgReviewToDoneMs: number | null;
  avgProgressToHoldMs: number | null;
  avgTodoToApprovedMs: number | null;
  targetReviewDays: number;
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
