import { createStatusMapProfile } from '../createStatusMapProfile';

export const wskinsSubtaskWorkflowProfile = createStatusMapProfile({
  id: 'wskins_subtask',
  label: 'WSkins Sub-task',
  efficiencyModel: 'wskins',
  statusMap: {
    'To Do': 'backlog',
    Todo: 'backlog',
    'In Progress': 'active',
    'On approval': 'waiting',
    Done: 'done',
    Cancelled: 'cancelled',
  },
  transitionRules: [
    { from: 'backlog', to: 'active', startsCycle: true },
    { from: 'active', to: 'waiting', countsAsReviewSubmission: true },
    { from: 'waiting', to: 'done', completesCycle: true },
    { from: 'active', to: 'done', completesCycle: true },
  ],
  stageOverrides: {
    waiting: {
      countsAsActiveWork: false,
      countsAsWaiting: true,
      countsAsAttentionEligible: false,
      countsAsCapacityContributor: false,
    },
  },
});
