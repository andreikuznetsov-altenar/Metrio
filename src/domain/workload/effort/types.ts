import type { AssigneeEffortMode } from '../../workflows/types';

/** Inclusive calendar range (yyyy-MM-dd) during which the person is away. */
export interface LeavePeriod {
  start: string;
  end: string;
}

export type EffortEstimateSource =
  | 'jira_remaining_estimate'
  | 'jira_original_estimate'
  | 'person_profile_type'
  | 'team_profile_type'
  | 'org_profile_type'
  | 'profile'
  | 'due_date'
  | 'global_fallback'
  | 'not_applicable';

/** One finished (or in-flight) piece of history the estimators draw from. */
export interface ExecutionSample {
  issueKey: string;
  ownerKey: string | null;
  /** Project/board key used as the team-level estimation bucket. */
  teamKey: string;
  profileId: string;
  issueType: string;
  /** Business hours the issue spent in hands_on statuses, start to finish. */
  handsOnHours: number;
}

/** A visit to a reserve stage (review) or QA, and what happened next. */
export interface ReserveVisitSample {
  issueKey: string;
  ownerKey: string | null;
  teamKey: string;
  profileId: string;
  issueType: string;
  kind: 'review' | 'qa';
  /** True when the issue went back to a hands_on status (backflow / rework). */
  returned: boolean;
  /** Business hours of hands_on work that followed a return, until the next hand-off. */
  reworkHours: number | null;
}

/** Time a queued issue took (or has so far waited) to enter hands_on work. */
export interface StartWaitSample {
  issueKey: string;
  ownerKey: string | null;
  teamKey: string;
  profileId: string;
  issueType: string;
  /** Business days waited. */
  waitDays: number;
  /** True when the issue did enter hands_on; false = still queued (right-censored). */
  started: boolean;
}

export interface EffortHistory {
  execution: ExecutionSample[];
  reserveVisits: ReserveVisitSample[];
  startWaits: StartWaitSample[];
}

export interface EffortBreakdownItem {
  issueKey: string;
  profileId: string;
  rawStatus: string;
  canonicalStage: string;
  effortMode: AssigneeEffortMode;
  /** Estimated total hands-on effort of the issue (null when not applicable). */
  estimatedTotalHours: number | null;
  /** Hands-on business hours already spent. */
  elapsedHandsOnHours: number | null;
  estimatedRemainingHours: number | null;
  /** P(start within the horizon) for queued issues. */
  startProbability: number | null;
  /** P(the issue returns to hands_on) for review/QA issues. */
  returnProbability: number | null;
  expectedReworkHours: number | null;
  reserveHours: number;
  /** Final expected assignee effort in the horizon - the figure that sums to expectedEffortHours. */
  contributionHours: number;
  totalEstimateSource: EffortEstimateSource | null;
  remainingEstimateSource: EffortEstimateSource | null;
  startProbabilitySource: EffortEstimateSource | null;
  startProbabilityScheduled: boolean | null;
  reserveEstimateSource: EffortEstimateSource | null;
  reworkEstimateSource: EffortEstimateSource | null;
  estimateSource: EffortEstimateSource;
  /** Size multiplier applied by a board-specific adapter, when one exists. */
  volumeMultiplier: number | null;
  volumeSource: string | null;
}

export interface PipelineSignals {
  assigned: number;
  handsOn: number;
  queued: number;
  review: number;
  qa: number;
  hold: number;
  waiting: number;
  externalWait: number;
}

export interface CurrentEffortResult {
  expectedEffortHours: number;
  handsOnRemainingHours: number;
  reserveReworkHours: number;
  expectedQueuedHours: number;
  availableHoursInHorizon: number;
  horizonWorkingDays: number;
  leaveWorkingDays: number;
  /** expected effort / available hours * 100 (0 when nothing is available and nothing is expected). */
  currentLoadPercent: number;
  breakdown: EffortBreakdownItem[];
  pipeline: PipelineSignals;
  /** Number of simultaneous hands-on issues: a context-switching signal, not part of the percent. */
  concurrency: number;
}
