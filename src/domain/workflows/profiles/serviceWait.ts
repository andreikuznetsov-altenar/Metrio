import { createStatusMapProfile } from '../createStatusMapProfile';

export const serviceWaitWorkflowProfile = createStatusMapProfile({
  id: 'service_wait',
  label: 'Service / Wait',
  efficiencyModel: 'none',
  statusMap: {
    New: 'backlog',
    'In Progress': 'active',
    'Waiting for Customer': 'waiting',
    'Waiting for Provider': 'waiting',
    Resolved: 'done',
    Closed: 'done',
    Cancelled: 'cancelled',
  },
});
