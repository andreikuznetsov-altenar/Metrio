import { classicReviewWorkflowProfile } from './profiles/classicReview';
import { designReviewWorkflowProfile } from './profiles/designReview';
import { devQaReleaseWorkflowProfile } from './profiles/devQaRelease';
import { editorialWorkflowProfile } from './profiles/editorial';
import { governanceWorkflowProfile } from './profiles/governance';
import { productHandoverWorkflowProfile } from './profiles/productHandover';
import { serviceWaitWorkflowProfile } from './profiles/serviceWait';
import { simpleWorkflowProfile } from './profiles/simple';
import { uxWorkflowProfile } from './profiles/ux';
import { wskinsSkinWorkflowProfile } from './profiles/wskinsSkin';
import { wskinsSubtaskWorkflowProfile } from './profiles/wskinsSubtask';
import type { WorkflowProfile } from './types';

const BUILTIN_PROFILES: WorkflowProfile[] = [
  uxWorkflowProfile,
  wskinsSkinWorkflowProfile,
  wskinsSubtaskWorkflowProfile,
  designReviewWorkflowProfile,
  simpleWorkflowProfile,
  classicReviewWorkflowProfile,
  devQaReleaseWorkflowProfile,
  productHandoverWorkflowProfile,
  governanceWorkflowProfile,
  editorialWorkflowProfile,
  serviceWaitWorkflowProfile,
];

const byId: Record<string, WorkflowProfile> = {};
BUILTIN_PROFILES.forEach((profile) => {
  byId[profile.id] = profile;
});

export function listBuiltinWorkflowProfiles(): WorkflowProfile[] {
  return [...BUILTIN_PROFILES];
}

export function getProfileById(profileId: string): WorkflowProfile | null {
  return byId[profileId] || null;
}

export function registerWorkflowProfile(profile: WorkflowProfile): void {
  byId[profile.id] = profile;
}
