import { createStatusMapProfile } from '../createStatusMapProfile';

export const agtcProviderWorkflowProfile = createStatusMapProfile({
  id: 'agtc_provider',
  label: 'AGTC Provider',
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
  // The BA, not the analyst, takes the issue from the handover on.
  effortByStatus: { 'E. Ready For BA Handover': 'external_wait' },
});

export const prdDiscoveryWorkflowProfile = createStatusMapProfile({
  id: 'prd_discovery',
  label: 'PRD Discovery / Handover',
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
  // 'Issue Approved' waits for the handover slot; analysis/handover questions can come back.
  effortByStatus: {
    'Issue Approved': 'external_wait',
    'Analysis Completed': 'reserve',
    Handover: 'reserve',
  },
});

export const prdTaskWorkflowProfile = createStatusMapProfile({
  id: 'prd_task',
  label: 'PRD Task',
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
  statusMap: {
    Open: 'backlog',
    'In Progress': 'active',
    'Awaiting approval': 'review',
    'Order Placed': 'waiting',
    Delivered: 'done',
    Cancelled: 'cancelled',
  },
  // Approval is decided by someone else and does not come back as rework.
  effortByStatus: { 'Awaiting approval': 'external_wait' },
});

export const citSecurityPatchWorkflowProfile = createStatusMapProfile({
  id: 'cit_security_patch',
  label: 'CIT Security Patch',
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
