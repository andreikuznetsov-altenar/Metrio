import type { CanonicalStage, ResolvedWorkflowStage } from './types';

export function presetForCanonicalStage(
  canonicalStage: CanonicalStage,
  statusName: string,
): ResolvedWorkflowStage {
  switch (canonicalStage) {
    case 'unknown':
      return {
        canonicalStage,
        statusName,
        isMapped: false,
        diagnosticCode: 'unmapped_status',
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
    case 'backlog':
      return {
        canonicalStage,
        statusName,
        isMapped: true,
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
        isMapped: true,
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
        isMapped: true,
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
        isMapped: true,
        countsAsActiveWork: false,
        countsAsReview: false,
        countsAsQa: true,
        countsAsWaiting: false,
        countsAsHold: false,
        countsAsAttentionEligible: true,
        countsAsCapacityContributor: false,
        isTerminal: false,
        isCompletion: false,
      };
    case 'waiting':
      return {
        canonicalStage,
        statusName,
        isMapped: true,
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
        isMapped: true,
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
        isMapped: true,
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
        isMapped: true,
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
