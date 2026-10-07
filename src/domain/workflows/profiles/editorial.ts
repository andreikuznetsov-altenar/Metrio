import { createStatusMapProfile } from '../createStatusMapProfile';

export const editorialWorkflowProfile = createStatusMapProfile({
  id: 'editorial',
  label: 'Editorial',
  efficiencyModel: 'ux',
  statusMap: {
    Idea: 'backlog',
    Backlog: 'backlog',
    New: 'backlog',
    Queue: 'waiting',
    Translation: 'active',
    Writing: 'active',
    'Update needed': 'active',
    Editing: 'review',
    Proofreading: 'review',
    'Ready to Publish': 'qa',
    Published: 'done',
    Publish: 'done',
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
