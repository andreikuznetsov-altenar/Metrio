import { createStatusMapProfile } from '../createStatusMapProfile';

export const devQaReleaseWorkflowProfile = createStatusMapProfile({
  id: 'dev_qa_release',
  label: 'Dev / QA / Release',
  efficiencyModel: 'ux',
  statusMap: {
    Backlog: 'backlog',
    Development: 'active',
    'In Development': 'active',
    'In Progress': 'active',
    'Code Review': 'review',
    Review: 'review',
    QA: 'qa',
    Testing: 'qa',
    Release: 'waiting',
    Released: 'done',
    Done: 'done',
    'On Hold': 'hold',
    Cancelled: 'cancelled',
  },
  transitionRules: [
    { from: 'backlog', to: 'active', startsCycle: true },
    { from: 'active', to: 'review', countsAsReviewSubmission: true },
    { from: 'review', to: 'qa', countsAsReviewSubmission: true },
    { from: 'qa', to: 'waiting' },
    { from: 'waiting', to: 'done', completesCycle: true },
    { from: 'qa', to: 'done', completesCycle: true },
  ],
});
