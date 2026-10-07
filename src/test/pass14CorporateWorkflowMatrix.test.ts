import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent } from '../domain/jira/types';
import { diagnoseIssueWorkflow } from '../domain/workflows/workflowDiagnostics';
import { extractProfileContributorCycles } from '../domain/workflows/profileCycles';
import { resolveWorkflowProfile } from '../domain/workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../domain/workflows/resolveWorkflowStage';
import { normalizeStatusKey } from '../domain/workflows/normalizeStatus';

function issue(input: {
  key: string;
  project: string;
  issueType?: string;
  status: string;
  events?: IssueEvent[];
}): AuditIssue {
  return {
    issueKey: input.key,
    projectKey: input.project,
    issueSummary: input.key,
    issueCreated: '2026-01-05T09:00:00.000Z',
    assigneeName: 'User',
    issueTypeName: input.issueType ?? 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events: input.events ?? [],
    rangeEvents: [],
    currentStatus: input.status,
  };
}

function event(fromValue: string, toValue: string, changedAt: string): IssueEvent {
  return {
    eventType: 'Status',
    changedAt,
    changedBy: 'User',
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

const projectCases = [
  ['UX', 'Task', 'In Review', 'ux', 'review'],
  ['WS', 'Skin', 'Internal Review', 'wskins_skin', 'hold'],
  ['WS', 'Sub-task', 'On approval', 'wskins_subtask', 'waiting'],
  ['AGTC', 'Task', 'Design Review', 'design_review', 'review'],
  ['AGTC', 'Provider', 'Provider', 'agtc_provider', 'backlog'],
  ['AIVA', 'Task', 'In Progress', 'design_review', 'active'],
  ['AGP', 'Task', 'In Review', 'classic_review', 'review'],
  ['AGP', 'Story', 'QA', 'agp_development', 'qa'],
  ['AGP', 'Dev Internals', 'Under discussion', 'agp_internal', 'backlog'],
  ['ADF', 'Task', 'QA', 'dev_qa_release', 'qa'],
  ['ADF', 'Incident', 'Waiting for User Story', 'adf_incident', 'waiting'],
  ['PRD', 'Story', 'D. Review', 'prd_phased', 'review'],
  ['PRD', 'New Feature', 'Handover Completed', 'prd_discovery', 'waiting'],
  ['PRD', 'Task', 'Analysis', 'prd_task', 'active'],
  ['ARCH', 'Task', 'Published', 'governance', 'done'],
  ['CRC', 'Task', 'Ready to Publish', 'editorial', 'qa'],
  ['CIT', 'Task', 'Deployed on UAT', 'cit_delivery', 'qa'],
  ['CIT', 'Purchase Request', 'Order Placed', 'cit_purchase', 'waiting'],
  ['CIT', 'Security Patch', 'Ready for Scan', 'cit_security_patch', 'qa'],
] as const;

describe('PASS14 corporate workflow matrix', () => {
  it.each(projectCases)(
    '%s %s maps %s through %s to %s with canonical semantics',
    (project, issueType, status, expectedProfile, expectedStage) => {
      const item = issue({
        key: `${project}-1`,
        project,
        issueType,
        status,
      });
      const profile = resolveWorkflowProfile(item);
      const stage = resolveWorkflowStage(profile, status);
      expect(profile.id).toBe(expectedProfile);
      expect(stage.canonicalStage).toBe(expectedStage);
      expect(stage.isMapped).toBe(true);
      expect(stage.countsAsActiveWork).toBe(expectedStage === 'active');
      expect(stage.countsAsReview).toBe(expectedStage === 'review');
      expect(stage.countsAsQa).toBe(expectedStage === 'qa');
      expect(stage.countsAsCapacityContributor).toBe(expectedStage === 'active');
      const legacyWskinsCompletion =
        expectedProfile === 'wskins_skin' && expectedStage === 'hold';
      expect(stage.isCompletion).toBe(
        expectedStage === 'done' || legacyWskinsCompletion,
      );
    },
  );

  it.each([
    ['AGTC', 'Provider', ['Provider', 'To Do', 'In Progress', 'In Review', 'On Hold', 'Done', 'Cancelled']],
    ['AIVA', 'Task', ['To Do', 'In Progress', 'Need to fix', 'Under review', 'On hold', 'Done', 'Cancel']],
    ['AGP', 'Task', ['TODO', 'In Progress', 'In Review', 'Ready for test', 'Testing on Stage', 'Tested on Stage', 'Ready for Release', 'Released', 'On Hold', 'Cancelled']],
    ['AGP', 'Story', ['New', 'Picked for Development', 'Postponed', 'Blocked', 'In Progress', 'Code Review', 'Merged on Develop', 'QA', 'QA Done', 'Closed']],
    ['AGP', 'Dev Internals', ['Under discussion', 'In Progress', 'Done', 'Declined']],
    ['ADF', 'Task', ['To Do', 'In Progress', 'Code Review', 'Blocked', 'QA IN PROGRESS', 'Quality Assurance', 'QA on hold', 'Release Candidate', 'Done', 'Rejected']],
    ['ADF', 'Incident', ['To Do', 'In Progress', 'Waiting for User Story', 'Done', 'Rejected']],
    ['PRD', 'Story', ['A. Open', 'B. Issue Approved', 'C. Analysis', 'D. Review', 'E. Ready For BA Handover', 'F. Handed Over to BA', 'G. Tech Analysis', 'H. Ready for Development', 'I. Rollout/QA', 'J. Acceptance Testing', 'K. Ready for Release', 'L. Completed', 'M. Backlog', 'M. Cancelled']],
    ['PRD', 'New Feature', ['Request/Idea', 'Postponed', 'Analysis', 'Business Analysis / High Fidelity UX', 'Analysis Completed', 'Issue Approved', 'Handover', 'Handover Completed', 'Technical Decomposition', 'In development', 'Rollout/QA', 'Completed', 'Discarded']],
    ['PRD', 'Task', ['Open', 'Analysis', 'Review', 'Completed', 'Not Required', 'Cancelled']],
    ['ARCH', 'Task', ['Backlog', 'In Progress', 'Request to start review', 'Request for Comments', 'Request for Approval', 'Paused', 'Suspended', 'Done', 'Process Exception: Concluded de facto', 'Rejected', 'Cancelled']],
    ['CRC', 'Task', ['Backlog', 'New', 'Queue', 'Translation', 'Writing', 'Update needed', 'Proofreading', 'Publish']],
    ['CIT', 'Task', ['Backlog', 'Suspended', 'In Progress', 'On Hold', 'Deployed on UAT', 'Ongoing', 'Deployed to Production', 'Done', 'Cancelled']],
    ['CIT', 'Purchase Request', ['Open', 'In Progress', 'Awaiting approval', 'Order Placed', 'Delivered', 'Cancelled']],
    ['CIT', 'Security Patch', ['Backlog', 'Postponed', 'Investigating', 'Applying Patch', 'Ready for Scan', 'Done', 'Cancelled']],
    ['UX', 'Design Task', ['TODO', 'In Progress', 'Need to Fix', 'In Review', 'On Hold', 'Done', 'Cancelled']],
    ['WS', 'Skin', ['Not started WS', 'In Progress', 'Internal Review', 'On approval', 'PRE-LIVE', 'Live', 'Archived']],
    ['WS', 'Sub-task', ['To Do', 'In Progress', 'On approval', 'Done']],
  ] as const)(
    'explicitly maps every Jira-metadata status for %s %s',
    (project, issueType, statuses) => {
      const item = issue({
        key: `${project}-META`,
        project,
        issueType,
        status: statuses[0],
      });
      const profile = resolveWorkflowProfile(item);
      for (const status of statuses) {
        expect(
          profile.statusToCanonical[normalizeStatusKey(status)],
          `${project} ${issueType} ${status} must be explicit in ${profile.id}`,
        ).toBeTruthy();
      }
    },
  );

  it('uses project/profile semantics for the same raw label', () => {
    const ux = issue({ key: 'UX-2', project: 'UX', status: 'Done' });
    const ws = issue({
      key: 'WS-2',
      project: 'WS',
      issueType: 'Skin',
      status: 'Done',
    });
    expect(
      resolveWorkflowStage(resolveWorkflowProfile(ux), ux.currentStatus).canonicalStage,
    ).toBe('done');
    expect(
      resolveWorkflowStage(resolveWorkflowProfile(ws), ws.currentStatus).canonicalStage,
    ).toBe('waiting');
  });

  it('specific mapping wins over semantic textual inference', () => {
    const item = issue({ key: 'CUST-1', project: 'CUST', status: 'QA' });
    const profile = resolveWorkflowProfile(item, {
      mappings: [{ projectKey: 'CUST', profileId: 'simple' }],
    });
    const stage = resolveWorkflowStage(profile, item.currentStatus);
    expect(profile.id).toBe('simple');
    expect(stage.canonicalStage).toBe('qa');
    expect(stage.countsAsActiveWork).toBe(false);
    expect(stage.countsAsCapacityContributor).toBe(false);
  });

  it('keeps unknown status safe and detectable', () => {
    const item = issue({
      key: 'UX-404',
      project: 'UX',
      status: 'Corporate Mystery Gate',
    });
    const stage = resolveWorkflowStage(resolveWorkflowProfile(item), item.currentStatus);
    expect(stage.canonicalStage).toBe('unknown');
    expect(stage.isMapped).toBe(false);
    expect(stage.countsAsActiveWork).toBe(false);
    expect(stage.countsAsCapacityContributor).toBe(false);
    expect(stage.isCompletion).toBe(false);
    expect(diagnoseIssueWorkflow(item).unmappedStatuses).toEqual([
      'Corporate Mystery Gate',
    ]);
  });

  it('resolves linked cross-project issues through their own profiles', () => {
    const agtc = issue({
      key: 'AGTC-105',
      project: 'AGTC',
      status: 'Design Review',
    });
    const ux = issue({
      key: 'UX-1234',
      project: 'UX',
      status: 'Published',
    });
    expect(resolveWorkflowProfile(agtc).id).toBe('design_review');
    expect(resolveWorkflowProfile(ux).id).toBe('ux');
    expect(
      resolveWorkflowStage(resolveWorkflowProfile(agtc), agtc.currentStatus)
        .canonicalStage,
    ).toBe('review');
    expect(
      resolveWorkflowStage(resolveWorkflowProfile(ux), ux.currentStatus)
        .canonicalStage,
    ).toBe('done');
  });

  it('normalizes every historical transition through one issue profile', () => {
    const events = [
      event('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      event('In Progress', 'In Review', '2026-01-07T09:00:00.000Z'),
      event('In Review', 'In Progress', '2026-01-19T09:00:00.000Z'),
      event('In Progress', 'In Review', '2026-01-20T09:00:00.000Z'),
      event('In Review', 'Done', '2026-01-21T09:00:00.000Z'),
    ];
    const item = issue({
      key: 'UX-500',
      project: 'UX',
      status: 'Done',
      events,
    });
    const profile = resolveWorkflowProfile(item);
    const cycles = extractProfileContributorCycles(item, profile);
    expect(profile.id).toBe('ux');
    expect(cycles).toHaveLength(1);
    expect(cycles[0].hasBackflow).toBe(true);
    expect(cycles[0].isFirstPass).toBe(false);
    // Only two active segments contribute; twelve review days do not.
    expect(cycles[0].activeCapacityMs / 86400000).toBeCloseTo(3, 4);
  });
});
