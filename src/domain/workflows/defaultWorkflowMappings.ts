import type { WorkflowProfileMapping } from './types';

export const DEFAULT_WORKFLOW_MAPPINGS: WorkflowProfileMapping[] = [
  { projectKey: 'UX', profileId: 'ux' },
  { projectKey: 'UX', issueType: 'Design Improvement', profileId: 'design_review' },
  { projectKey: 'WS', issueType: 'Skin', profileId: 'wskins_skin' },
  { projectKey: 'WS', issueType: 'Sub-task', profileId: 'wskins_subtask' },
  { projectKey: 'AGTC', profileId: 'design_review' },
  { projectKey: 'AIVA', profileId: 'design_review' },
  { projectKey: 'AGP', profileId: 'classic_review' },
  { projectKey: 'ADF', profileId: 'dev_qa_release' },
  { projectKey: 'PRD', profileId: 'product_handover' },
  { projectKey: 'ARCH', profileId: 'governance' },
  { projectKey: 'CRC', profileId: 'editorial' },
  { projectKey: 'CIT', profileId: 'service_wait' },
];
