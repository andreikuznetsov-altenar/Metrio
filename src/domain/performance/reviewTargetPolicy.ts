import type { PerformanceReviewTarget } from '../performance';

/** Legacy Jira App exposed a single configurable target; Metrio presets map scope + SLA days. */
export const SPRINT_TARGET_REVIEW_DAYS = 2;

export interface ReviewTargetPolicy {
  teamScope: 'direct' | 'full';
  targetReviewDays: number;
  label: string;
}

export function resolveReviewTargetPolicy(
  reviewTarget: PerformanceReviewTarget,
  configuredTargetReviewDays: number,
  audience: 'team' | 'employee',
): ReviewTargetPolicy {
  const baseDays = Math.max(1, configuredTargetReviewDays || 3);

  if (audience === 'employee') {
    if (reviewTarget === 'quarter') {
      return {
        teamScope: 'direct',
        targetReviewDays: baseDays,
        label: 'Quarter goal',
      };
    }
    if (reviewTarget === 'personal') {
      return {
        teamScope: 'direct',
        targetReviewDays: baseDays,
        label: 'Personal target',
      };
    }
    return {
      teamScope: 'direct',
      targetReviewDays: SPRINT_TARGET_REVIEW_DAYS,
      label: 'Sprint target',
    };
  }

  if (reviewTarget === 'org') {
    return {
      teamScope: 'full',
      targetReviewDays: baseDays,
      label: 'Org target',
    };
  }
  if (reviewTarget === 'sprint') {
    return {
      teamScope: 'direct',
      targetReviewDays: SPRINT_TARGET_REVIEW_DAYS,
      label: 'Sprint target',
    };
  }
  return {
    teamScope: 'direct',
    targetReviewDays: baseDays,
    label: 'Team target',
  };
}
