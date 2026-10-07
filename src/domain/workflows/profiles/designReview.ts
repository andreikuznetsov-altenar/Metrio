import { createStatusMapProfile } from '../createStatusMapProfile';

export const designReviewWorkflowProfile = createStatusMapProfile({
  id: 'design_review',
  label: 'Design Review',
  efficiencyModel: 'ux',
  statusMap: {
    'To Do': 'backlog',
    Todo: 'backlog',
    TODO: 'backlog',
    Draft: 'active',
    'In Progress': 'active',
    'Need to Fix': 'active',
    'Need to fix': 'active',
    'Design Review': 'review',
    'In Review': 'review',
    'Under review': 'review',
    Pending: 'waiting',
    Approved: 'done',
    'Published / Closed': 'done',
    Rejected: 'active',
    Done: 'done',
    'On Hold': 'hold',
    Cancelled: 'cancelled',
    Cancel: 'cancelled',
  },
});
