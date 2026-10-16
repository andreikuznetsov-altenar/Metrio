import { describe, expect, it } from 'vitest';
import { resolveAssigneeEffortMode } from './assigneeEffort';
import { DEFAULT_ASSIGNEE_EFFORT_BY_STAGE } from './createStatusMapProfile';
import { getProfileById, listBuiltinWorkflowProfiles } from './profileRegistry';
import type { AssigneeEffortMode, CanonicalStage } from './types';

const STAGE_MATRIX: Array<[CanonicalStage, AssigneeEffortMode]> = [
  ['unknown', 'none'],
  ['backlog', 'queued'],
  ['active', 'hands_on'],
  ['review', 'reserve'],
  ['qa', 'external_wait'],
  ['waiting', 'external_wait'],
  ['hold', 'external_wait'],
  ['done', 'none'],
  ['cancelled', 'none'],
];

const PROFILE_OVERRIDES: Array<[string, string, AssigneeEffortMode]> = [
  ['wskins_skin', 'Internal Review', 'external_wait'],
  ['wskins_skin', 'On approval', 'external_wait'],
  ['wskins_skin', 'PRE-LIVE', 'external_wait'],
  ['wskins_skin', 'Live', 'external_wait'],
  ['wskins_skin', 'Done', 'none'],
  ['agp_development', 'Code Review', 'reserve'],
  ['agp_development', 'QA', 'external_wait'],
  ['agp_development', 'Merged on Develop', 'external_wait'],
  ['dev_qa_release', 'Code Review', 'reserve'],
  ['dev_qa_release', 'Quality Assurance', 'external_wait'],
  ['dev_qa_release', 'QA IN PROGRESS', 'external_wait'],
  ['dev_qa_release', 'Release Candidate', 'external_wait'],
  ['dev_qa_release', 'Blocked', 'external_wait'],
  ['prd_phased', 'C. Analysis', 'hands_on'],
  ['prd_phased', 'D. Review', 'reserve'],
  ['prd_phased', 'E. Ready For BA Handover', 'external_wait'],
  ['prd_phased', 'I. Rollout/QA', 'external_wait'],
  ['prd_discovery', 'Technical Decomposition', 'hands_on'],
  ['prd_discovery', 'Analysis Completed', 'reserve'],
  ['prd_discovery', 'Issue Approved', 'external_wait'],
  ['prd_discovery', 'Handover', 'reserve'],
  ['governance', 'Request to start review', 'external_wait'],
  ['governance', 'Request for Comments', 'reserve'],
  ['governance', 'Request for Approval', 'external_wait'],
  ['editorial', 'Editing', 'reserve'],
  ['editorial', 'Ready to Publish', 'external_wait'],
  ['cit_delivery', 'Deployed on UAT', 'external_wait'],
  ['cit_purchase', 'Awaiting approval', 'external_wait'],
  ['cit_security_patch', 'Ready for Scan', 'external_wait'],
];

describe('assignee-effort workflow matrix', () => {
  it.each(STAGE_MATRIX)('%s defaults to %s', (stage, expected) => {
    expect(DEFAULT_ASSIGNEE_EFFORT_BY_STAGE[stage]).toBe(expected);
  });

  it.each(PROFILE_OVERRIDES)('%s / %s => %s', (profileId, status, expected) => {
    const profile = getProfileById(profileId);
    expect(profile).not.toBeNull();
    expect(resolveAssigneeEffortMode(profile!, status)).toBe(expected);
  });

  it('gives every mapped status an explicit stage-backed semantic', () => {
    for (const profile of listBuiltinWorkflowProfiles()) {
      for (const normalizedStatus of Object.keys(profile.statusToCanonical)) {
        expect(resolveAssigneeEffortMode(profile, normalizedStatus)).toMatch(
          /^(hands_on|queued|reserve|external_wait|none)$/,
        );
      }
    }
  });

  it('keeps unmapped statuses in strict corporate profiles out of workload', () => {
    for (const profile of listBuiltinWorkflowProfiles().filter((item) => item.strictStatusMap)) {
      expect(resolveAssigneeEffortMode(profile, 'UNMAPPED CORPORATE STATUS')).toBe('none');
    }
  });
});
