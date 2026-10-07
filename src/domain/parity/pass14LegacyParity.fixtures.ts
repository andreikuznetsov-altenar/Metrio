import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { legacyIsReverseTransition_ } from './legacy/uxCodeGsReference';

export const PERIOD_30D: ReportParams = {
  dateFrom: '2024-01-02',
  dateTo: '2024-01-31',
  targetReviewDays: 3,
  users: ['alice@example.com', 'bob@example.com'],
  projects: ['UX', 'WS'],
};

export const PERIOD_7D: ReportParams = {
  ...PERIOD_30D,
  dateFrom: '2024-01-25',
  dateTo: '2024-01-31',
};

export const PERIOD_3M: ReportParams = {
  ...PERIOD_30D,
  dateFrom: '2023-11-01',
  dateTo: '2024-01-31',
};

export const PERIOD_6M: ReportParams = {
  ...PERIOD_30D,
  dateFrom: '2023-08-01',
  dateTo: '2024-01-31',
};

function statusEvent(
  fromValue: string,
  toValue: string,
  changedAt: string,
  extra: Partial<IssueEvent> = {},
): IssueEvent {
  const isBackflow =
    extra.isBackflow ?? legacyIsReverseTransition_(fromValue, toValue);
  return {
    eventType: 'Status',
    changedAt,
    changedBy: extra.changedBy ?? 'alice@example.com',
    fromValue,
    toValue,
    timeSincePreviousStatusMs: extra.timeSincePreviousStatusMs ?? null,
    isBackflow,
    isHandoff: extra.isHandoff ?? false,
    isReturnToTeam: extra.isReturnToTeam ?? false,
    excludeFromEfficiencyBackflow: extra.excludeFromEfficiencyBackflow ?? false,
  };
}

function assigneeEvent(fromValue: string, toValue: string, changedAt: string): IssueEvent {
  return {
    eventType: 'Assignee',
    changedAt,
    changedBy: 'system',
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: true,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function baseIssue(
  issueKey: string,
  currentStatus: string,
  events: IssueEvent[],
  extra: Partial<AuditIssue> = {},
): AuditIssue {
  const {
    issueSummary,
    issueCreated,
    assigneeName,
    projectKey,
    issueTypeName,
    isSubtask,
    rangeEvents,
    currentAssigneeCanonical,
    ...rest
  } = extra;
  return {
    issueKey,
    issueSummary: issueSummary ?? `${issueKey} fixture`,
    issueCreated: issueCreated ?? '2024-01-02T08:00:00.000Z',
    assigneeName: assigneeName ?? 'Alice',
    projectKey: projectKey ?? issueKey.split('-')[0],
    issueTypeName: issueTypeName ?? 'Task',
    isSubtask,
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events,
    rangeEvents: rangeEvents ?? events,
    currentStatus,
    currentAssigneeCanonical: currentAssigneeCanonical ?? 'alice@example.com',
    ...rest,
  };
}

/** 1. Todo → In Progress → Review → Done */
export const uxHappyPath = baseIssue('UX-1', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-08T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-10T09:00:00.000Z'),
]);

/** 2. In Progress → Review → In Progress → Review → Done (backflow) */
export const uxBackflowCycle = baseIssue('UX-2', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-08T09:00:00.000Z'),
  statusEvent('In Review', 'In Progress', '2024-01-09T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-10T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-11T09:00:00.000Z'),
]);

/** 3. Long Review — entered review, not completed */
export const uxLongReview = baseIssue('UX-3', 'In Review', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-04T09:00:00.000Z'),
]);

/** 4. Hold */
export const uxHold = baseIssue('UX-4', 'On Hold', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'On Hold', '2024-01-05T09:00:00.000Z'),
]);

/** 5. Waiting (Pending in UX map) */
export const uxWaiting = baseIssue('UX-5', 'Pending', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'Pending', '2024-01-05T09:00:00.000Z'),
]);

/** 6. Cancelled */
export const uxCancelled = baseIssue('UX-6', 'Cancelled', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'Cancelled', '2024-01-05T09:00:00.000Z'),
]);

/** 7. Reassignment Alice → Bob, same completed cycle */
export const uxReassigned = baseIssue(
  'UX-7',
  'Done',
  [
    statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
    assigneeEvent('Alice', 'Bob', '2024-01-04T12:00:00.000Z'),
    statusEvent('In Progress', 'In Review', '2024-01-08T09:00:00.000Z'),
    statusEvent('In Review', 'Done', '2024-01-10T09:00:00.000Z'),
  ],
  {
    assigneeName: 'Bob',
    currentAssigneeCanonical: 'bob@example.com',
  },
);

/** 8. Multiple completed cycles on one issue */
export const uxMultipleCycles = baseIssue('UX-8', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-04T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-05T09:00:00.000Z'),
  statusEvent('Done', 'To Do', '2024-01-08T09:00:00.000Z'),
  statusEvent('To Do', 'In Progress', '2024-01-08T10:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-09T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-10T09:00:00.000Z'),
]);

/** 9. First-pass (alias of happy path with distinct key) */
export const uxFirstPass = baseIssue('UX-9', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-08T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-10T09:00:00.000Z'),
]);

/** 10. Backflow alias (distinct key) */
export const uxBackflow = uxBackflowCycle;

/** 11. Completion after the 30d window */
export const uxNoCompletionInPeriod = baseIssue('UX-11', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-08T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-02-02T09:00:00.000Z'),
]);

/** 12. Completion exactly on dateTo 23:59:59.999 */
export const uxBoundaryInclusive = baseIssue('UX-12', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-25T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-29T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-31T23:59:59.999Z'),
]);

/** 12b. Completion at dateTo 00:00:00 — still inclusive */
export const uxBoundaryStartOfDay = baseIssue('UX-12B', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-25T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-29T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-31T00:00:00.000Z'),
]);

/** 13. 7d-window completion (Jan 26) */
export const uxSevenDay = baseIssue('UX-13', 'Done', [
  statusEvent('To Do', 'In Progress', '2024-01-25T09:00:00.000Z'),
  statusEvent('In Progress', 'In Review', '2024-01-26T09:00:00.000Z'),
  statusEvent('In Review', 'Done', '2024-01-26T15:00:00.000Z'),
]);

/** 14. 30d-window — same as happy path */
export const uxThirtyDay = uxHappyPath;

/** 15. 3m — completed in November 2023 */
export const uxThreeMonth = baseIssue(
  'UX-15',
  'Done',
  [
    statusEvent('To Do', 'In Progress', '2023-11-06T09:00:00.000Z'),
    statusEvent('In Progress', 'In Review', '2023-11-08T09:00:00.000Z'),
    statusEvent('In Review', 'Done', '2023-11-10T09:00:00.000Z'),
  ],
  { issueCreated: '2023-11-01T08:00:00.000Z' },
);

/** 16. 6m — completed in August 2023 */
export const uxSixMonth = baseIssue(
  'UX-16',
  'Done',
  [
    statusEvent('To Do', 'In Progress', '2023-08-07T09:00:00.000Z'),
    statusEvent('In Progress', 'In Review', '2023-08-09T09:00:00.000Z'),
    statusEvent('In Review', 'Done', '2023-08-11T09:00:00.000Z'),
  ],
  { issueCreated: '2023-08-01T08:00:00.000Z' },
);

/** WSkins main: To Do → In Progress → Internal Review (completion) */
export const wsHappyPath = baseIssue(
  'WS-1',
  'Internal Review',
  [
    statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
    statusEvent('In Progress', 'Internal Review', '2024-01-08T09:00:00.000Z'),
  ],
  { projectKey: 'WS', issueTypeName: 'Skin' },
);

export const wsBackflowThenComplete = baseIssue(
  'WS-2',
  'Internal Review',
  [
    statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
    statusEvent('In Progress', 'Internal Review', '2024-01-05T09:00:00.000Z'),
    statusEvent('Internal Review', 'In Progress', '2024-01-08T09:00:00.000Z'),
    statusEvent('In Progress', 'Internal Review', '2024-01-10T09:00:00.000Z'),
  ],
  { projectKey: 'WS', issueTypeName: 'Skin' },
);

export const wsLongReview = baseIssue(
  'WS-3',
  'In Progress',
  [statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z')],
  { projectKey: 'WS', issueTypeName: 'Skin' },
);

export const wsHoldAsInternalReview = baseIssue(
  'WS-4',
  'On Hold',
  [
    statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
    statusEvent('In Progress', 'On Hold', '2024-01-05T09:00:00.000Z'),
  ],
  { projectKey: 'WS', issueTypeName: 'Skin' },
);

export const wsCancelled = baseIssue(
  'WS-6',
  'Cancelled',
  [
    statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
    statusEvent('In Progress', 'Cancelled', '2024-01-05T09:00:00.000Z'),
  ],
  { projectKey: 'WS', issueTypeName: 'Skin' },
);

export const wsNoCompletionInPeriod = baseIssue(
  'WS-11',
  'Internal Review',
  [
    statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
    statusEvent('In Progress', 'Internal Review', '2024-02-02T09:00:00.000Z'),
  ],
  { projectKey: 'WS', issueTypeName: 'Skin' },
);

export const wsBoundary = baseIssue(
  'WS-12',
  'Internal Review',
  [
    statusEvent('To Do', 'In Progress', '2024-01-25T09:00:00.000Z'),
    statusEvent('In Progress', 'Internal Review', '2024-01-31T23:59:59.999Z'),
  ],
  { projectKey: 'WS', issueTypeName: 'Skin' },
);

export const wsSubtaskBackflowDone = baseIssue(
  'WS-20',
  'Done',
  [
    statusEvent('To Do', 'In Progress', '2024-01-03T09:00:00.000Z'),
    statusEvent('In Progress', 'On approval', '2024-01-05T09:00:00.000Z'),
    statusEvent('On approval', 'In Progress', '2024-01-08T09:00:00.000Z', { isBackflow: true }),
    statusEvent('In Progress', 'On approval', '2024-01-09T09:00:00.000Z'),
    statusEvent('On approval', 'Done', '2024-01-10T09:00:00.000Z'),
  ],
  { projectKey: 'WS', issueTypeName: 'Sub-task', isSubtask: true },
);

export interface ParityFixture {
  id: string;
  title: string;
  flow: string;
  params: ReportParams;
  issues: AuditIssue[];
  /** UX Code.gs vs Metrio buildKpiFromIssues */
  compareUxLegacy: boolean;
  /** WSkinsAudit.gs vs Metrio WSkins / workflow KPI */
  compareWskinsLegacy: boolean;
  /** PASS 14.1 product-rule workload, not GS Time Stat */
  compareWorkloadProduct: boolean;
}

export const UX_FIXTURES: ParityFixture[] = [
  {
    id: '1-todo-ip-review-done',
    title: 'Todo → In Progress → Review → Done',
    flow: 'happy-path',
    params: PERIOD_30D,
    issues: [uxHappyPath],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '2-ip-review-ip-review-done',
    title: 'In Progress → Review → In Progress → Review → Done',
    flow: 'backflow-cycle',
    params: PERIOD_30D,
    issues: [uxBackflowCycle],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '3-long-review',
    title: 'Long Review',
    flow: 'open-review',
    params: PERIOD_30D,
    issues: [uxLongReview],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '4-hold',
    title: 'Hold',
    flow: 'hold',
    params: PERIOD_30D,
    issues: [uxHold],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '5-waiting',
    title: 'Waiting',
    flow: 'waiting',
    params: PERIOD_30D,
    issues: [uxWaiting],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '6-cancelled',
    title: 'Cancelled task',
    flow: 'cancelled',
    params: PERIOD_30D,
    issues: [uxCancelled],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '7-reassignment',
    title: 'Reassignment between employees',
    flow: 'reassignment',
    params: PERIOD_30D,
    issues: [uxReassigned],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '8-multiple-cycles',
    title: 'Multiple completed cycles',
    flow: 'multi-cycle',
    params: PERIOD_30D,
    issues: [uxMultipleCycles],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '9-first-pass',
    title: 'First-pass task',
    flow: 'first-pass',
    params: PERIOD_30D,
    issues: [uxFirstPass],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '10-backflow',
    title: 'Backflow task',
    flow: 'backflow',
    params: PERIOD_30D,
    issues: [uxBackflow],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '11-no-completion-in-period',
    title: 'No completion in period',
    flow: 'out-of-period',
    params: PERIOD_30D,
    issues: [uxNoCompletionInPeriod],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: true,
  },
  {
    id: '12-boundary',
    title: 'Completion exactly on date boundary',
    flow: 'boundary',
    params: PERIOD_30D,
    issues: [uxBoundaryInclusive, uxBoundaryStartOfDay],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: false,
  },
  {
    id: '13-7d',
    title: '7d range',
    flow: 'range-7d',
    params: PERIOD_7D,
    issues: [uxSevenDay, uxHappyPath],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: false,
  },
  {
    id: '14-30d',
    title: '30d range',
    flow: 'range-30d',
    params: PERIOD_30D,
    issues: [uxThirtyDay],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: false,
  },
  {
    id: '15-3m',
    title: '3m range',
    flow: 'range-3m',
    params: PERIOD_3M,
    issues: [uxThreeMonth, uxHappyPath],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: false,
  },
  {
    id: '16-6m',
    title: '6m range',
    flow: 'range-6m',
    params: PERIOD_6M,
    issues: [uxSixMonth, uxThreeMonth, uxHappyPath],
    compareUxLegacy: true,
    compareWskinsLegacy: false,
    compareWorkloadProduct: false,
  },
];

export const WSKINS_FIXTURES: ParityFixture[] = [
  {
    id: 'ws-1-happy',
    title: 'WSkins Todo → In Progress → Internal Review',
    flow: 'ws-happy',
    params: PERIOD_30D,
    issues: [wsHappyPath],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: true,
  },
  {
    id: 'ws-2-backflow',
    title: 'WSkins Internal Review → In Progress → Internal Review',
    flow: 'ws-backflow',
    params: PERIOD_30D,
    issues: [wsBackflowThenComplete],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: false,
  },
  {
    id: 'ws-3-long-progress',
    title: 'WSkins long In Progress (no Internal Review)',
    flow: 'ws-long',
    params: PERIOD_30D,
    issues: [wsLongReview],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: true,
  },
  {
    id: 'ws-4-hold',
    title: 'WSkins On Hold (main remap is ingest-time, not KPI)',
    flow: 'ws-hold',
    params: PERIOD_30D,
    issues: [wsHoldAsInternalReview],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: true,
  },
  {
    id: 'ws-6-cancelled',
    title: 'WSkins cancelled',
    flow: 'ws-cancelled',
    params: PERIOD_30D,
    issues: [wsCancelled],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: true,
  },
  {
    id: 'ws-11-no-completion',
    title: 'WSkins no completion in period',
    flow: 'ws-out-of-period',
    params: PERIOD_30D,
    issues: [wsNoCompletionInPeriod],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: false,
  },
  {
    id: 'ws-12-boundary',
    title: 'WSkins completion on date boundary',
    flow: 'ws-boundary',
    params: PERIOD_30D,
    issues: [wsBoundary],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: false,
  },
  {
    id: 'ws-subtask-backflow',
    title: 'WSkins subtask backflow then Done',
    flow: 'ws-subtask',
    params: PERIOD_30D,
    issues: [wsSubtaskBackflowDone],
    compareUxLegacy: false,
    compareWskinsLegacy: true,
    compareWorkloadProduct: false,
  },
];

export const TEAM_REASSIGNMENT_GROUPED = {
  'alice@example.com': { issues: [uxHappyPath, uxReassigned] },
  'bob@example.com': { issues: [uxReassigned] },
};
