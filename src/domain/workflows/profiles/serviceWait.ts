import { createStatusMapProfile } from '../createStatusMapProfile';

export const serviceWaitWorkflowProfile = createStatusMapProfile({
  id: 'service_wait',
  label: 'Service / Wait',
  efficiencyModel: 'none',
  statusMap: {
    New: 'backlog',
    Backlog: 'backlog',
    Open: 'backlog',
    Suspended: 'hold',
    'In Progress': 'active',
    'On Hold': 'hold',
    'Waiting for Customer': 'waiting',
    'Waiting for Provider': 'waiting',
    'Deployed on UAT': 'qa',
    Resolved: 'done',
    Closed: 'done',
    Done: 'done',
    Ongoing: 'done',
    'Deployed to Production': 'done',
    Cancelled: 'cancelled',
  },
});
