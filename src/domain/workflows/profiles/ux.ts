import { createStatusMapProfile } from '../createStatusMapProfile';

export const uxWorkflowProfile = createStatusMapProfile({
  id: 'ux',
  label: 'UX Design',
  efficiencyModel: 'ux',
  statusMap: {
    'To Do': 'backlog',
    TODO: 'backlog',
    'Open': 'backlog',
    Backlog: 'backlog',
    Draft: 'active',
    'In Progress': 'active',
    'Need to Fix': 'active',
    Pending: 'waiting',
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
