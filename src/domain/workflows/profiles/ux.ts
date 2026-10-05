import { createStatusMapProfile } from '../createStatusMapProfile';

export const uxWorkflowProfile = createStatusMapProfile({
  id: 'ux',
  label: 'UX Design',
  efficiencyModel: 'ux',
  statusMap: {
    'To Do': 'backlog',
    'Open': 'backlog',
    Backlog: 'backlog',
    'In Progress': 'active',
    'In Review': 'review',
    Review: 'review',
    Approved: 'done',
    Published: 'done',
    Done: 'done',
    Closed: 'done',
    'On Hold': 'hold',
    Blocked: 'hold',
    Cancelled: 'cancelled',
    Canceled: 'cancelled',
  },
});
