import { createStatusMapProfile } from '../createStatusMapProfile';

export const simpleWorkflowProfile = createStatusMapProfile({
  id: 'simple',
  label: 'Simple',
  efficiencyModel: 'ux',
  statusMap: {
    'To Do': 'backlog',
    'In Progress': 'active',
    Done: 'done',
    Cancelled: 'cancelled',
  },
});
