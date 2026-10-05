import { createStatusMapProfile } from '../createStatusMapProfile';

export const editorialWorkflowProfile = createStatusMapProfile({
  id: 'editorial',
  label: 'Editorial',
  efficiencyModel: 'ux',
  statusMap: {
    Idea: 'backlog',
    Writing: 'active',
    Editing: 'review',
    'Ready to Publish': 'qa',
    Published: 'done',
    'On Hold': 'hold',
    Cancelled: 'cancelled',
  },
  transitionRules: [
    { from: 'backlog', to: 'active', startsCycle: true },
    { from: 'active', to: 'review', countsAsReviewSubmission: true },
    { from: 'review', to: 'qa', countsAsReviewSubmission: true },
    { from: 'qa', to: 'done', completesCycle: true },
  ],
});
