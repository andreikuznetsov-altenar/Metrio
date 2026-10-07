import { createStatusMapProfile } from '../createStatusMapProfile';

export const classicReviewWorkflowProfile = createStatusMapProfile({
  id: 'classic_review',
  label: 'Classic Review',
  efficiencyModel: 'ux',
  statusMap: {
    Open: 'backlog',
    New: 'backlog',
    TODO: 'backlog',
    'To Do': 'backlog',
    'Testing on Stage': 'qa',
    'In Progress': 'active',
    'Need to Fix': 'active',
    Review: 'review',
    'In Review': 'review',
    'Ready for test': 'qa',
    'Tested on Stage': 'qa',
    'Ready for Release': 'waiting',
    Done: 'done',
    Closed: 'done',
    Released: 'done',
    'On Hold': 'hold',
    Cancelled: 'cancelled',
  },
});
