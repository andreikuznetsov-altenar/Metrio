import { presetForCanonicalStage } from './stagePresets';
import { normalizeStatusKey } from './normalizeStatus';
import type {
  AssigneeEffortMode,
  CanonicalStage,
  ResolvedWorkflowStage,
  WorkflowProfile,
  WorkflowTransitionRule,
} from './types';

export interface StatusMapProfileInput {
  id: string;
  label: string;
  /** Raw Jira status name → canonical stage. */
  statusMap: Record<string, CanonicalStage>;
  /**
   * Corporate profiles stay strict. Only the generic `simple` fallback
   * should set this false so name inference remains a compatibility path.
   */
  strictStatusMap?: boolean;
  transitionRules?: WorkflowTransitionRule[];
  /** Per-canonical-stage overrides of the default assignee-effort semantics. */
  effortByStage?: Partial<Record<CanonicalStage, AssigneeEffortMode>>;
  /** Per-raw-status overrides (for profiles where one canonical stage mixes different ownership). */
  effortByStatus?: Record<string, AssigneeEffortMode>;
  stageOverrides?: Partial<
    Record<CanonicalStage, Partial<Omit<ResolvedWorkflowStage, 'canonicalStage' | 'statusName'>>>
  >;
}

/**
 * Default assignee effort per canonical stage. QA defaults to external_wait: in the corporate
 * workflows QA is performed by another role, so the original assignee only keeps a rework reserve.
 */
export const DEFAULT_ASSIGNEE_EFFORT_BY_STAGE: Record<CanonicalStage, AssigneeEffortMode> = {
  unknown: 'none',
  backlog: 'queued',
  active: 'hands_on',
  review: 'reserve',
  qa: 'external_wait',
  waiting: 'external_wait',
  hold: 'external_wait',
  done: 'none',
  cancelled: 'none',
};

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

  ([
    'unknown',
    'backlog',
    'active',
    'review',
    'qa',
    'waiting',
    'hold',
    'done',
    'cancelled',
  ] as CanonicalStage[]).forEach(
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
    statusToCanonical,
    stages,
    transitionRules: input.transitionRules ?? DEFAULT_TRANSITION_RULES,
    strictStatusMap: input.strictStatusMap ?? true,
    assigneeEffort: {
      byStage: { ...DEFAULT_ASSIGNEE_EFFORT_BY_STAGE, ...input.effortByStage },
      byStatus: Object.fromEntries(
        Object.entries(input.effortByStatus ?? {}).map(([status, mode]) => [
          normalizeStatusKey(status),
          mode,
        ]),
      ),
    },
  };
}
