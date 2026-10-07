import type { CanonicalStage, ResolvedWorkflowStage } from './types';

export function presetForCanonicalStage(
  canonicalStage: CanonicalStage,
  statusName: string,
): ResolvedWorkflowStage {
  switch (canonicalStage) {
    case 'backlog':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: false,
        countsAsReview: false,
        countsAsQa: false,
        countsAsWaiting: false,
        countsAsHold: false,
        countsAsAttentionEligible: false,
        countsAsCapacityContributor: false,
        isTerminal: false,
        isCompletion: false,
      };
    case 'active':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: true,
        countsAsReview: false,
        countsAsQa: false,
        countsAsWaiting: false,
        countsAsHold: false,
        countsAsAttentionEligible: true,
        countsAsCapacityContributor: true,
        isTerminal: false,
        isCompletion: false,
      };
    case 'review':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: false,
        countsAsReview: true,
        countsAsQa: false,
        countsAsWaiting: false,
        countsAsHold: false,
        countsAsAttentionEligible: true,
        countsAsCapacityContributor: false,
        isTerminal: false,
        isCompletion: false,
      };
    case 'qa':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: true,
        countsAsReview: false,
        countsAsQa: true,
        countsAsWaiting: false,
        countsAsHold: false,
        countsAsAttentionEligible: true,
        countsAsCapacityContributor: true,
        isTerminal: false,
        isCompletion: false,
      };
    case 'waiting':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: false,
        countsAsReview: false,
        countsAsQa: false,
        countsAsWaiting: true,
        countsAsHold: false,
        countsAsAttentionEligible: false,
        countsAsCapacityContributor: false,
        isTerminal: false,
        isCompletion: false,
      };
    case 'hold':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: false,
        countsAsReview: false,
        countsAsQa: false,
        countsAsWaiting: false,
        countsAsHold: true,
        countsAsAttentionEligible: true,
        countsAsCapacityContributor: false,
        isTerminal: false,
        isCompletion: false,
      };
    case 'done':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: false,
        countsAsReview: false,
        countsAsQa: false,
        countsAsWaiting: false,
        countsAsHold: false,
        countsAsAttentionEligible: false,
        countsAsCapacityContributor: false,
        isTerminal: true,
        isCompletion: true,
      };
    case 'cancelled':
      return {
        canonicalStage,
        statusName,
        countsAsActiveWork: false,
        countsAsReview: false,
        countsAsQa: false,
        countsAsWaiting: false,
        countsAsHold: false,
        countsAsAttentionEligible: false,
        countsAsCapacityContributor: false,
        isTerminal: true,
        isCompletion: false,
      };
    default:
      return presetForCanonicalStage('backlog', statusName);
  }
}
