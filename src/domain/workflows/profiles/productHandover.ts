import { createStatusMapProfile } from '../createStatusMapProfile';

export const productHandoverWorkflowProfile = createStatusMapProfile({
  id: 'product_handover',
  label: 'Product Handover',
  efficiencyModel: 'none',
  statusMap: {
    'To Do': 'backlog',
    'In Progress': 'active',
    'Ready for Handover': 'review',
    Handover: 'review',
    Accepted: 'done',
    Done: 'done',
    'On Hold': 'hold',
    Cancelled: 'cancelled',
  },
  stageOverrides: {
    waiting: {
      countsAsWaiting: true,
      countsAsAttentionEligible: false,
    },
  },
});
