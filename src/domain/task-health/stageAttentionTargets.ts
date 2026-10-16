/**
 * Stage- and profile-specific attention targets for Task Health and Delivery Risk.
 *
 * A single `targetReviewDays` used to judge Active, Review and QA stages on every board. A
 * design draft in progress, a code review and a QA pass have different natural durations, and
 * boards differ (an incident board is not a governance board). Targets are therefore resolved per
 * (workflow profile, timed stage):
 *
 *   attentionDays  A  stage age at which the task deserves a look (Delivery Risk "Info")
 *   targetDays     T  on-time target; beyond it the stage is overdue (Task Health "problematic")
 *   criticalDays   2T beyond twice the target the stage is a Critical delivery risk
 *
 * Stage age is measured in weekday-days spent in the CURRENT stage (`getCurrentStageAgeMs`).
 * The Review target is the report's configured `targetReviewDays` (that is literally what it
 * means); Active and QA derive from the operational attention rules. Each is scaled by the
 * profile's multiplier below.
 */
import type { WorkflowProfile } from '../workflows/types';

export type TimedStageKind = 'active' | 'review' | 'qa';

export interface StageAttentionTarget {
  stage: TimedStageKind;
  attentionDays: number;
  targetDays: number;
  criticalDays: number;
  profileScale: number;
}

export interface StageTargetBases {
  /** Base Active-stage attention days before profile scaling (review rule + in-progress grace). */
  activeAttentionDays: number;
  /** Base Review-stage attention days (the operational "review attention" rule). */
  reviewAttentionDays: number;
  /** Base QA-stage attention days. */
  qaAttentionDays: number;
}

export const DEFAULT_STAGE_TARGET_BASES: StageTargetBases = {
  activeAttentionDays: 5,
  reviewAttentionDays: 3,
  qaAttentionDays: 3,
};

/**
 * Profile multipliers on the base days. Defaults to 1. Documented, explicit and editable in one
 * place; they are calibration defaults, not statistics derived from completed work.
 */
export const PROFILE_STAGE_SCALE: Readonly<
  Record<string, Partial<Record<TimedStageKind, number>>>
> = {
  // Design iteration is longer than a code change; review turnaround is unchanged.
  ux: { active: 2 },
  design_review: { active: 2 },
  editorial: { active: 2 },
  // Sign-off style boards: long stakeholder review and longer working stages.
  governance: { active: 2, review: 2 },
  product_handover: { active: 2, review: 2 },
  prd_phased: { active: 2, review: 2 },
  prd_discovery: { active: 2, review: 2 },
  prd_task: { active: 2, review: 2 },
  // Incidents must move faster than regular delivery work.
  adf_incident: { active: 0.5, review: 0.5, qa: 0.5 },
  // Explicit rows (scale 1) so every delivery board is visibly accounted for.
  dev_qa_release: {},
  agp_development: {},
  classic_review: {},
};

function roundHalfDays(value: number): number {
  return Math.max(1, Math.round(value * 2) / 2);
}

export function timedStageKind(stage: {
  canonicalStage: string;
  countsAsReview: boolean;
  countsAsQa: boolean;
  countsAsActiveWork: boolean;
}): TimedStageKind | null {
  if (stage.countsAsReview) return 'review';
  if (stage.countsAsQa) return 'qa';
  if (stage.canonicalStage === 'active' || stage.countsAsActiveWork) return 'active';
  return null;
}

export function resolveStageAttentionTarget(input: {
  profile: Pick<WorkflowProfile, 'id'>;
  stage: TimedStageKind;
  /** The report's configured review target (days). Applies to the Review stage only. */
  reviewTargetDays?: number;
  bases?: Partial<StageTargetBases>;
}): StageAttentionTarget {
  const bases = { ...DEFAULT_STAGE_TARGET_BASES, ...input.bases };
  const scale = PROFILE_STAGE_SCALE[input.profile.id]?.[input.stage] ?? 1;

  let baseAttention: number;
  let baseTarget: number;
  if (input.stage === 'review') {
    baseAttention = bases.reviewAttentionDays;
    const configured = input.reviewTargetDays;
    baseTarget =
      configured !== undefined && Number.isFinite(configured) && configured > 0
        ? configured
        : bases.reviewAttentionDays;
  } else if (input.stage === 'qa') {
    baseAttention = bases.qaAttentionDays;
    baseTarget = bases.qaAttentionDays * 2;
  } else {
    baseAttention = bases.activeAttentionDays;
    baseTarget = bases.activeAttentionDays * 2;
  }

  const attentionDays = roundHalfDays(baseAttention * scale);
  const targetDays = Math.max(attentionDays, roundHalfDays(baseTarget * scale));
  return {
    stage: input.stage,
    attentionDays,
    targetDays,
    criticalDays: targetDays * 2,
    profileScale: scale,
  };
}
