import { createStatusMapProfile } from '../createStatusMapProfile';

export const agtcProviderWorkflowProfile = createStatusMapProfile({
  id: 'agtc_provider',
  label: 'AGTC Provider',
  efficiencyModel: 'ux',
  statusMap: {
    Provider: 'backlog',
    'To Do': 'backlog',
    'In Progress': 'active',
    'In Review': 'review',
    'On Hold': 'hold',
    Done: 'done',
    Cancelled: 'cancelled',
  },
});

export const agpDevelopmentWorkflowProfile = createStatusMapProfile({
  id: 'agp_development',
  label: 'AGP Development',
  efficiencyModel: 'ux',
  statusMap: {
    New: 'backlog',
    'Picked for Development': 'backlog',
    Postponed: 'backlog',
    Blocked: 'hold',
    'In Progress': 'active',
    'Code Review': 'review',
    'Merged on Develop': 'waiting',
    QA: 'qa',
    'QA Done': 'waiting',
    Closed: 'done',
  },
});

export const agpInternalWorkflowProfile = createStatusMapProfile({
  id: 'agp_internal',
  label: 'AGP Internal Discussion',
  efficiencyModel: 'none',
  statusMap: {
    'Under discussion': 'backlog',
    'In Progress': 'active',
    Done: 'done',
    Declined: 'cancelled',
  },
});

export const adfIncidentWorkflowProfile = createStatusMapProfile({
  id: 'adf_incident',
  label: 'ADF Incident',
  efficiencyModel: 'ux',
  statusMap: {
    'To Do': 'backlog',
    'In Progress': 'active',
    'Waiting for User Story': 'waiting',
    Done: 'done',
    Rejected: 'cancelled',
  },
});

export const prdPhasedWorkflowProfile = createStatusMapProfile({
  id: 'prd_phased',
  label: 'PRD Phased Delivery',
  efficiencyModel: 'none',
  statusMap: {
    'Request/Idea': 'backlog',
    Open: 'backlog',
    '1. Open': 'backlog',
    'A. Open': 'backlog',
    'M. Backlog': 'backlog',
    'B. Issue Approved': 'active',
    'C. Analysis': 'active',
    'D. Review': 'review',
    'E. Ready For BA Handover': 'review',
    'F. Handed Over to BA': 'waiting',
    'G. Tech Analysis': 'active',
    'H. Ready for Development': 'waiting',
    'I. Rollout/QA': 'qa',
    'J. Acceptance Testing': 'qa',
    'K. Ready for Release': 'waiting',
    'L. Completed': 'done',
    'L. Cancelled': 'cancelled',
    'M. Cancelled': 'cancelled',
  },
});

export const prdDiscoveryWorkflowProfile = createStatusMapProfile({
  id: 'prd_discovery',
  label: 'PRD Discovery / Handover',
  efficiencyModel: 'none',
  statusMap: {
    'Request/Idea': 'backlog',
    Postponed: 'backlog',
    'In Progress': 'active',
    'Waiting for support': 'waiting',
    Analysis: 'active',
    'Business Analysis / High Fidelity UX': 'active',
    'Analysis Completed': 'review',
    'Issue Approved': 'review',
    Handover: 'review',
    'Handover Completed': 'waiting',
    'Technical Decomposition': 'active',
    'In development': 'active',
    'Rollout/QA': 'qa',
    Completed: 'done',
    Discarded: 'cancelled',
  },
});

export const prdTaskWorkflowProfile = createStatusMapProfile({
  id: 'prd_task',
  label: 'PRD Task',
  efficiencyModel: 'none',
  statusMap: {
    Open: 'backlog',
    Analysis: 'active',
    Review: 'review',
    Completed: 'done',
    'Not Required': 'cancelled',
    Cancelled: 'cancelled',
  },
});

export const citDeliveryWorkflowProfile = createStatusMapProfile({
  id: 'cit_delivery',
  label: 'CIT Delivery',
  efficiencyModel: 'none',
  statusMap: {
    Backlog: 'backlog',
    Suspended: 'hold',
    'In Progress': 'active',
    'On Hold': 'hold',
    'Deployed on UAT': 'qa',
    Ongoing: 'done',
    'Deployed to Production': 'done',
    Done: 'done',
    Cancelled: 'cancelled',
  },
});

export const citPurchaseWorkflowProfile = createStatusMapProfile({
  id: 'cit_purchase',
  label: 'CIT Purchase Request',
  efficiencyModel: 'none',
  statusMap: {
    Open: 'backlog',
    'In Progress': 'active',
    'Awaiting approval': 'review',
    'Order Placed': 'waiting',
    Delivered: 'done',
    Cancelled: 'cancelled',
  },
});

export const citSecurityPatchWorkflowProfile = createStatusMapProfile({
  id: 'cit_security_patch',
  label: 'CIT Security Patch',
  efficiencyModel: 'none',
  statusMap: {
    Backlog: 'backlog',
    Postponed: 'backlog',
    Investigating: 'active',
    'Applying Patch': 'active',
    'Ready for Scan': 'qa',
    Done: 'done',
    Cancelled: 'cancelled',
  },
});
