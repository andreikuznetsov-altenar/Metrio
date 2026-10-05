import { createStatusMapProfile } from '../createStatusMapProfile';

export const governanceWorkflowProfile = createStatusMapProfile({
  id: 'governance',
  label: 'Governance',
  efficiencyModel: 'none',
  statusMap: {
    Draft: 'backlog',
    'In Review': 'review',
    Approved: 'done',
    Rejected: 'active',
    Published: 'done',
    Archived: 'done',
    'On Hold': 'hold',
  },
});
