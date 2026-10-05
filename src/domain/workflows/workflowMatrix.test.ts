import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent } from '../jira/types';
import { isWorkflowCapacityEligible, isWorkflowKpiEligible } from './eligibility';
import { getProfileById } from './profileRegistry';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { resolveWorkflowStage } from './resolveWorkflowStage';
import { classifyWorkflowProfileSemantically } from './semanticClassifier';

function issue(partial: Partial<AuditIssue> & Pick<AuditIssue, 'issueKey'>): AuditIssue {
  return {
    issueSummary: partial.issueKey,
    issueCreated: '2025-01-01T09:00:00.000Z',
    assigneeName: 'User',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: 'none',
    epicKey: 'none',
    epicSummary: 'none',
    epicStatus: 'none',
    epicContentType: 'none',
    epicDesignImprovementType: 'none',
    events: [],
    rangeEvents: [],
    ...partial,
  };
}

function statusEvent(from: string, to: string, at: string): IssueEvent {
  return {
    eventType: 'Status',
    changedAt: at,
    changedBy: 'User',
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

describe('workflow matrix', () => {
  it('resolves profile by projectKey + issueType before projectKey only', () => {
    const uxDesign = issue({
      issueKey: 'UX-1',
      projectKey: 'UX',
      issueTypeName: 'Design Improvement',
      currentStatus: 'In Progress',
    });
    expect(resolveWorkflowProfile(uxDesign).id).toBe('design_review');

    const uxTask = issue({
      issueKey: 'UX-2',
      projectKey: 'UX',
      issueTypeName: 'Task',
      currentStatus: 'In Progress',
    });
    expect(resolveWorkflowProfile(uxTask).id).toBe('ux');
  });

  it('resolves WSkins sub-task profile', () => {
    const sub = issue({
      issueKey: 'WS-9',
      projectKey: 'WS',
      issueTypeName: 'Sub-task',
      isSubtask: true,
      currentStatus: 'In Progress',
    });
    expect(resolveWorkflowProfile(sub).id).toBe('wskins_subtask');
  });

  it('falls back to semantic classifier for unknown project with QA statuses', () => {
    const unknown = issue({
      issueKey: 'X-1',
      projectKey: 'MYSTERY',
      currentStatus: 'QA',
      events: [statusEvent('In Progress', 'QA', '2025-02-01T10:00:00.000Z')],
    });
    expect(classifyWorkflowProfileSemantically(unknown).id).toBe('dev_qa_release');
    expect(resolveWorkflowProfile(unknown).id).toBe('dev_qa_release');
  });

  it('falls back to simple profile when nothing matches', () => {
    const bare = issue({
      issueKey: 'Z-1',
      projectKey: 'Z',
      currentStatus: 'To Do',
    });
    expect(resolveWorkflowProfile(bare).id).toBe('simple');
  });

  it('maps WSkins downstream statuses without active work or attention', () => {
    const profile = getProfileById('wskins_skin')!;
    for (const status of ['On approval', 'PRE-LIVE', 'Live', 'Archived']) {
      const stage = resolveWorkflowStage(profile, status);
      expect(stage.countsAsActiveWork).toBe(false);
      expect(stage.countsAsCapacityContributor).toBe(false);
      expect(stage.countsAsAttentionEligible).toBe(false);
    }
    const internalReview = resolveWorkflowStage(profile, 'Internal Review');
    expect(internalReview.canonicalStage).toBe('hold');
    expect(internalReview.countsAsAttentionEligible).toBe(false);
  });

  it('maps UX statuses to canonical stages', () => {
    const profile = getProfileById('ux')!;
    expect(resolveWorkflowStage(profile, 'In Review').canonicalStage).toBe('review');
    expect(resolveWorkflowStage(profile, 'Published').isCompletion).toBe(true);
    expect(resolveWorkflowStage(profile, 'On Hold').countsAsHold).toBe(true);
  });

  it('service wait statuses are not attention eligible', () => {
    const profile = getProfileById('service_wait')!;
    const waiting = resolveWorkflowStage(profile, 'Waiting for Customer');
    expect(waiting.countsAsAttentionEligible).toBe(false);
    expect(waiting.countsAsWaiting).toBe(true);
  });

  it('excludes Epic, Provider, Sprint Update from KPI and capacity', () => {
    const epic = issue({ issueKey: 'UX-99', issueTypeName: 'Epic' });
    expect(isWorkflowKpiEligible(epic)).toBe(false);
    expect(isWorkflowCapacityEligible(epic)).toBe(false);
  });

  it('company mapping override wins when passed via resolve options', () => {
    const custom = issue({
      issueKey: 'CUST-1',
      projectKey: 'CUST',
      issueTypeName: 'Task',
      currentStatus: 'Writing',
      events: [statusEvent('Idea', 'Writing', '2025-03-01T10:00:00.000Z')],
    });
    const profile = resolveWorkflowProfile(custom, {
      mappings: [{ projectKey: 'CUST', profileId: 'editorial' }],
    });
    expect(profile.id).toBe('editorial');
  });

  it('honors custom mapping priority project+type over project', () => {
    const typed = issue({
      issueKey: 'ENG-1',
      projectKey: 'ENG',
      issueTypeName: 'Bug',
      currentStatus: 'In Progress',
    });
    const profile = resolveWorkflowProfile(typed, {
      mappings: [
        { projectKey: 'ENG', issueType: 'Bug', profileId: 'simple' },
        { projectKey: 'ENG', profileId: 'dev_qa_release' },
      ],
    });
    expect(profile.id).toBe('simple');
  });
});
