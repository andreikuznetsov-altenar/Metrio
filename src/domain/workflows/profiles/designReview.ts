import { createStatusMapProfile } from '../createStatusMapProfile';

export const designReviewWorkflowProfile = createStatusMapProfile({
  id: 'design_review',
  label: 'Design Review',
  efficiencyModel: 'ux',
  statusMap: {
    'To Do': 'backlog',
    Todo: 'backlog',
    TODO: 'backlog',
    'In Progress': 'active',
    'Design Review': 'review',
    'In Review': 'review',
    Approved: 'done',
    Rejected: 'active',
    Done: 'done',
    'On Hold': 'hold',
    Cancelled: 'cancelled',
  },
});
