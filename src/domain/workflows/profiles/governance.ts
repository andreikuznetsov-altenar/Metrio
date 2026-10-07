import { createStatusMapProfile } from '../createStatusMapProfile';

export const governanceWorkflowProfile = createStatusMapProfile({
  id: 'governance',
  label: 'Governance',
  efficiencyModel: 'none',
  statusMap: {
    Draft: 'backlog',
    Backlog: 'backlog',
    'In Progress': 'active',
    'Request to start review': 'review',
    'Request for Comments': 'review',
    'Request for Approval': 'review',
    'In Review': 'review',
    Approved: 'done',
    Rejected: 'cancelled',
    Published: 'done',
    Archived: 'done',
    Done: 'done',
    'Process Exception: Concluded de facto': 'done',
    'On Hold': 'hold',
    Paused: 'hold',
    Suspended: 'hold',
    Cancelled: 'cancelled',
  },
});
