import { presetForCanonicalStage } from './stagePresets';
import { normalizeStatusKey } from './normalizeStatus';
import type {
  CanonicalStage,
  ResolvedWorkflowStage,
  WorkflowEfficiencyModel,
  WorkflowProfile,
  WorkflowTransitionRule,
} from './types';

export interface StatusMapProfileInput {
  id: string;
  label: string;
  efficiencyModel: WorkflowEfficiencyModel;
  /** Raw Jira status name → canonical stage. */
  statusMap: Record<string, CanonicalStage>;
  transitionRules?: WorkflowTransitionRule[];
  stageOverrides?: Partial<
    Record<CanonicalStage, Partial<Omit<ResolvedWorkflowStage, 'canonicalStage' | 'statusName'>>>
  >;
}

const DEFAULT_TRANSITION_RULES: WorkflowTransitionRule[] = [
  { from: 'backlog', to: 'active', startsCycle: true },
  { from: 'active', to: 'review', countsAsReviewSubmission: true },
  { from: 'review', to: 'done', completesCycle: true },
  { from: 'active', to: 'done', completesCycle: true },
  { from: 'qa', to: 'done', completesCycle: true },
  { from: 'review', to: 'qa', countsAsReviewSubmission: true },
];

export function createStatusMapProfile(input: StatusMapProfileInput): WorkflowProfile {
  const statusToCanonical: Record<string, CanonicalStage> = {};
  Object.entries(input.statusMap).forEach(([status, stage]) => {
    statusToCanonical[normalizeStatusKey(status)] = stage;
  });

  const canonicalStages = new Set(Object.values(input.statusMap));
  const stages: Record<CanonicalStage, ResolvedWorkflowStage> = {} as Record<
    CanonicalStage,
    ResolvedWorkflowStage
  >;

  (['backlog', 'active', 'review', 'qa', 'waiting', 'hold', 'done', 'cancelled'] as CanonicalStage[]).forEach(
    (canonicalStage) => {
      const representative =
        Object.entries(input.statusMap).find(([, s]) => s === canonicalStage)?.[0] ||
        canonicalStage;
      const base = presetForCanonicalStage(canonicalStage, representative);
      const override = input.stageOverrides?.[canonicalStage];
      stages[canonicalStage] = override ? { ...base, ...override, canonicalStage, statusName: base.statusName } : base;
      if (!canonicalStages.has(canonicalStage)) {
        const attentionEligible =
          canonicalStage === 'hold' || canonicalStage === 'waiting';
        stages[canonicalStage] = {
          ...stages[canonicalStage],
          countsAsActiveWork: false,
          countsAsAttentionEligible: attentionEligible
            ? stages[canonicalStage].countsAsAttentionEligible
            : false,
          countsAsCapacityContributor: false,
        };
      }
    },
  );

  return {
    id: input.id,
    label: input.label,
    efficiencyModel: input.efficiencyModel,
    statusToCanonical,
    stages,
    transitionRules: input.transitionRules ?? DEFAULT_TRANSITION_RULES,
  };
}
