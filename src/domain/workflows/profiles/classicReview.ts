import { createStatusMapProfile } from '../createStatusMapProfile';

export const classicReviewWorkflowProfile = createStatusMapProfile({
  id: 'classic_review',
  label: 'Classic Review',
  efficiencyModel: 'ux',
  statusMap: {
    Open: 'backlog',
    'In Progress': 'active',
    Review: 'review',
    Done: 'done',
    Closed: 'done',
    'On Hold': 'hold',
  },
});
