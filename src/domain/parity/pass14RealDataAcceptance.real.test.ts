import { describe, expect, it, vi } from 'vitest';
import { createPerformanceDateRange, previousComparableRange } from '../performance/performanceDateRange';
import { resolveRequiredComparisonCoverage } from '../history/historyRanges';
import { getTeamTrendHistoryState } from '../trends/teamTrendHistory';
import {
  compareTrendPeriodsForDisplayRange,
  compareWeightedAvgCycleTrend,
  compareWeightedFirstPassTrend,
  trendSufficiencyForDisplayRange,
} from '../trends/trendEngine';
import { teamTrendPoints } from '../snapshots/snapshotEngine';
import { buildIssueCatalog } from '../jira/issueCatalog';
import { collectUniqueTeamIssues } from '../jira/uniqueIssues';
import { assertUniqueCurrentOwnership, getOperationalIssues } from '../people/ownedIssues';
import { buildTaskListModalRowsFromIssueKeys } from '../actions/buildTaskListModalRows';
import { buildJiraIssueBrowseUrl } from '../../platform/jiraIssueUrl';
import { resolveJiraBaseUrl } from '../../config/product';
import { buildIssueEvents } from '../jira/events';
import type { AuditIssue } from '../jira/types';
import { DEFAULT_WORKFLOW_MAPPINGS } from '../workflows/defaultWorkflowMappings';
import { extractProfileContributorCycles } from '../workflows/profileCycles';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import {
  isExplicitProfileStatus,
  resolveWorkflowStage,
} from '../workflows/resolveWorkflowStage';
import { buildMyWeek } from '../personal/myWeek';

const runReal =
  process.env.METRIO_PASS14_REAL === '1' ||
  process.env.METRIO_REAL_RECONCILE === '1' ||
  process.env.METRIO_WORKFLOW_AUDIT === '1';

vi.mock('@tauri-apps/api/core', async () => {
  if (!runReal) {
    return { invoke: vi.fn() };
  }
  const { metrioRealInvoke } = await import('../../test/helpers/metrioRealInvoke');
  return {
    invoke: (command: string, args?: Record<string, unknown>) =>
      metrioRealInvoke(command, args),
  };
});

interface JiraIssuePayload {
  key?: string;
  fields?: {
    summary?: string;
    created?: string;
    status?: { name?: string };
    assignee?: { displayName?: string; accountId?: string };
    issuetype?: { name?: string; subtask?: boolean };
    project?: { key?: string };
  };
}

function issueFromJira(
  payload: JiraIssuePayload,
  changelogValues: unknown[],
): AuditIssue {
  const key = payload.key || '';
  const fields = payload.fields || {};
  const events = buildIssueEvents(changelogValues as never);
  return {
    issueKey: key,
    issueSummary: fields.summary || '',
    issueCreated: fields.created || '',
    assigneeName: fields.assignee?.displayName || '',
    projectKey: fields.project?.key || key.split('-')[0],
    issueTypeName: fields.issuetype?.name || 'Task',
    isSubtask: fields.issuetype?.subtask,
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events,
    rangeEvents: events,
    currentStatus: fields.status?.name || '',
  };
}

const FOCUS_NAME_TOKENS = ['andrei', 'valeriia', 'daria', 'konstantin', 'nikita'];
const CONFIGURED_PROJECTS = new Set(
  DEFAULT_WORKFLOW_MAPPINGS.map((mapping) => mapping.projectKey).filter(
    (projectKey): projectKey is string => Boolean(projectKey),
  ),
);
const RAW_EXECUTION_STATUS = /^(in progress|investigating|translation|writing|applying patch|need to fix)$/i;

function statusIntervals(issue: AuditIssue) {
  const profile = resolveWorkflowProfile(issue);
  const events = (issue.events || [])
    .filter((event) => event.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
  const rows: Array<{
    status: string;
    canonical: string;
    from: string;
    to: string;
    capacity: boolean;
    review: boolean;
    hold: boolean;
    waiting: boolean;
  }> = [];
  let cursor = issue.issueCreated || events[0]?.changedAt || '';
  let status = events[0]?.fromValue || issue.currentStatus || '';
  for (const event of events) {
    const stage = resolveWorkflowStage(profile, status);
    rows.push({
      status,
      canonical: stage.canonicalStage,
      from: cursor,
      to: event.changedAt,
      capacity: stage.countsAsCapacityContributor,
      review: stage.countsAsReview,
      hold: stage.countsAsHold,
      waiting: stage.countsAsWaiting,
    });
    cursor = event.changedAt;
    status = event.toValue || status;
  }
  return rows;
}

describe.skipIf(!runReal)('PASS 14.4 real Jira read-only acceptance', () => {
  it(
    'verifies AGTC-105, samples, workload, 6m history, and cross-screen consistency',
    async () => {
      const { fetchPerformanceData } = await import(
        '../../services/performance/performanceDataService'
      );
      const { loadPreferences } = await import('../../platform/preferences');
      const { JiraClient } = await import('../../services/jira/jiraClient');
      const { buildPerformanceViewModels } = await import(
        '../../services/performance/performanceViewModel'
      );
      const { getWorkEmail } = await import('../../platform/preferences');

      const prefs = await loadPreferences();
      const jiraBase = resolveJiraBaseUrl(prefs);
      expect(jiraBase).toMatch(/^https?:\/\//);
      const workEmail = getWorkEmail(prefs);
      expect(workEmail).toBeTruthy();

      const jira = new JiraClient({ baseUrl: jiraBase, email: workEmail });
      const agtcRaw = (await jira.fetchIssueByKey('AGTC-105')) as JiraIssuePayload;
      expect(agtcRaw?.key, 'AGTC-105 must resolve').toBe('AGTC-105');
      expect(agtcRaw.fields?.summary?.trim().length).toBeGreaterThan(0);
      expect(agtcRaw.fields?.status?.name?.trim().length).toBeGreaterThan(0);
      expect(agtcRaw.fields?.created?.trim().length).toBeGreaterThan(0);

      const changelog = (await jira.fetchAllChangelog('AGTC-105')) as unknown[];
      const agtcIssue = issueFromJira(agtcRaw, changelog);
      const agtcProfile = resolveWorkflowProfile(agtcIssue);
      const agtcStage = resolveWorkflowStage(agtcProfile, agtcIssue.currentStatus);
      const statusEvents = agtcIssue.events.filter((event) => event.eventType === 'Status');
      const lastStatusChange = statusEvents
        .slice()
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())[0]?.changedAt || null;
      expect(isExplicitProfileStatus(agtcProfile, agtcIssue.currentStatus)).toBe(true);
      console.info(
        JSON.stringify({
          agtc105: {
            key: agtcIssue.issueKey,
            summary: agtcIssue.issueSummary,
            currentStatus: agtcIssue.currentStatus,
            created: agtcIssue.issueCreated,
            lastStatusChange,
            project: agtcIssue.projectKey,
            issueType: agtcIssue.issueTypeName,
            profileId: agtcProfile.id,
            canonicalStage: agtcStage.canonicalStage,
            active: agtcStage.countsAsActiveWork,
            review: agtcStage.countsAsReview,
            capacity: agtcStage.countsAsCapacityContributor,
            assignee: agtcRaw.fields?.assignee?.displayName || null,
            assigneeAccountId: agtcRaw.fields?.assignee?.accountId || null,
            statusChangeEvents: statusEvents.length,
            jiraUrl: buildJiraIssueBrowseUrl(jiraBase, 'AGTC-105'),
          },
        }),
      );
      expect(agtcIssue.issueSummary).toBeTruthy();
      expect(agtcIssue.currentStatus).toBeTruthy();
      expect(agtcIssue.issueCreated).toBeTruthy();
      expect(buildJiraIssueBrowseUrl(jiraBase, 'AGTC-105')).toBe(
        `${jiraBase.replace(/\/$/, '')}/browse/AGTC-105`,
      );

      const range = createPerformanceDateRange('6m');
      const fetchResult = await fetchPerformanceData(range, 'team', 'team');
      const persons = fetchResult.teamSnapshot.persons;
      expect(persons.length).toBeGreaterThan(0);
      assertUniqueCurrentOwnership(fetchResult.teamSnapshot);

      const catalog = buildIssueCatalog({
        persons,
        issues: [agtcIssue, ...collectUniqueTeamIssues(persons)],
      });
      const modalRows = buildTaskListModalRowsFromIssueKeys(
        ['AGTC-105'],
        persons,
        jiraBase,
        catalog,
      );
      expect(modalRows).toHaveLength(1);
      expect(modalRows[0].title).toBe(agtcIssue.issueSummary);
      expect(modalRows[0].title).not.toBe('AGTC-105');
      expect(modalRows[0].status).toBe(agtcIssue.currentStatus);
      expect(modalRows[0].status).not.toBe('—');
      expect(modalRows[0].createdAt).toBe(agtcIssue.issueCreated);
      expect(modalRows[0].createdLabel).not.toBe('—');
      expect(modalRows[0].jiraUrl).toBe(buildJiraIssueBrowseUrl(jiraBase, 'AGTC-105'));
      if (statusEvents.length > 0) {
        expect(modalRows[0].lastStatusChangedAt).toBeTruthy();
        expect(modalRows[0].lastStatusChangeLabel).not.toBe('—');
      }

      const uniqueIssues = collectUniqueTeamIssues(persons);
      const uxSample = uniqueIssues.find((issue) => (issue.projectKey || issue.issueKey).startsWith('UX'));
      const agtcReview = uniqueIssues.find((issue) => {
        const project = issue.projectKey || issue.issueKey.split('-')[0];
        const stage = resolveWorkflowStage(
          resolveWorkflowProfile(issue),
          issue.currentStatus || '',
        );
        return project === 'AGTC' && stage.countsAsReview;
      });
      const completedSample = uniqueIssues.find((issue) => {
        const stage = resolveWorkflowStage(
          resolveWorkflowProfile(issue),
          issue.currentStatus || '',
        );
        return stage.isCompletion || stage.canonicalStage === 'done';
      });
      const activeSample = uniqueIssues.find((issue) => {
        const stage = resolveWorkflowStage(
          resolveWorkflowProfile(issue),
          issue.currentStatus || '',
        );
        return stage.countsAsActiveWork;
      });

      const samples = {
        ux: uxSample?.issueKey ?? null,
        agtcReview: agtcReview?.issueKey ?? null,
        completed: completedSample?.issueKey ?? null,
        active: activeSample?.issueKey ?? null,
      };
      console.info(JSON.stringify({ samples }));
      expect(uxSample || agtcReview || completedSample || activeSample).toBeTruthy();
      if (uxSample) {
        const uxRows = buildTaskListModalRowsFromIssueKeys(
          [uxSample.issueKey],
          persons,
          jiraBase,
          catalog,
        );
        expect(uxRows[0].title).not.toBe(uxSample.issueKey);
        expect(uxRows[0].title).not.toBe('—');
        expect(uxRows[0].status).not.toBe('—');
        expect(uxRows[0].createdLabel).not.toBe('—');
        expect(uxRows[0].jiraUrl).toBe(buildJiraIssueBrowseUrl(jiraBase, uxSample.issueKey));
      }

      const inferredCorporateOwned: string[] = [];
      const activeZeroBlockers: string[] = [];
      const workloadTable = persons.map((person) => {
        const w = person.workload;
        const owned = getOperationalIssues(person);
        const ownedKeys = owned.map((issue) => issue.issueKey);
        expect(new Set(ownedKeys).size).toBe(ownedKeys.length);
        const stageCounts: Record<string, number> = {};
        let rawExecutionNonActive = 0;
        const reviewInActive = owned.filter((issue) => {
          const profile = resolveWorkflowProfile(issue);
          const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
          stageCounts[stage.canonicalStage] = (stageCounts[stage.canonicalStage] || 0) + 1;
          const project = issue.projectKey || issue.issueKey.split('-')[0];
          if (
            CONFIGURED_PROJECTS.has(project) &&
            issue.currentStatus &&
            !isExplicitProfileStatus(profile, issue.currentStatus) &&
            stage.canonicalStage !== 'unknown'
          ) {
            inferredCorporateOwned.push(
              `${person.bamboo.displayName} ${issue.issueKey} ${issue.currentStatus} → ${stage.canonicalStage}`,
            );
          }
          const rawExecution = RAW_EXECUTION_STATUS.test((issue.currentStatus || '').trim());
          if (rawExecution && !stage.countsAsActiveWork && !stage.isTerminal && !stage.isCompletion) {
            rawExecutionNonActive += 1;
            activeZeroBlockers.push(
              `${person.bamboo.displayName} ${issue.issueKey} status=${issue.currentStatus} stage=${stage.canonicalStage} active=${stage.countsAsActiveWork}`,
            );
          }
          return stage.countsAsReview && stage.countsAsActiveWork;
        });
        expect(reviewInActive, `${person.bamboo.displayName} review counted as active`).toEqual([]);
        if ((w?.activeWorkCount ?? 0) === 0) {
          expect(w?.capacityBreakdown?.activeSegmentHours ?? 0).toBe(0);
        }
        if (rawExecutionNonActive > 0 && (w?.activeWorkCount ?? 0) === 0) {
          activeZeroBlockers.push(
            `${person.bamboo.displayName} has raw execution statuses but activeWorkCount=0`,
          );
        }
        if ((w?.capacityLoadPercent ?? 0) > 100) {
          expect(w?.level).toBe('overloaded');
          expect(w?.capacityDataState).toBe('measured');
          expect((w?.capacityBreakdown?.completedCyclesInPeriod ?? 0) > 0).toBe(true);
        } else {
          expect(w?.level).not.toBe('overloaded');
        }
        return {
          person: person.bamboo.displayName,
          owned: ownedKeys.length,
          active: w?.activeWorkCount ?? 0,
          review: w?.reviewCount ?? 0,
          qa: w?.qaCount ?? 0,
          hold: w?.holdCount ?? 0,
          waiting: w?.waitingCount ?? 0,
          backlog: w?.backlogCount ?? 0,
          unknown: w?.unknownCount ?? 0,
          capacityContributorCurrent: w?.capacityContributorIssueCount ?? 0,
          capacityLoadPercent: w?.capacityLoadPercent ?? 0,
          capacityDataState: w?.capacityDataState ?? 'insufficient_history',
          workloadLevel: w?.level ?? 'low',
          completedCyclesInPeriod: w?.capacityBreakdown?.completedCyclesInPeriod ?? 0,
          executionHours: w?.capacityBreakdown?.completedCycleHours ?? 0,
          activeSegmentHours: w?.capacityBreakdown?.activeSegmentHours ?? 0,
          stageCounts,
        };
      });
      const focusTeam = workloadTable.filter((row) =>
        FOCUS_NAME_TOKENS.some((token) => row.person.toLowerCase().includes(token)),
      );
      console.info(JSON.stringify({ workloadTable, focusTeam }));
      expect(inferredCorporateOwned, inferredCorporateOwned.join('\n')).toEqual([]);
      expect(activeZeroBlockers, activeZeroBlockers.join('\n')).toEqual([]);

      const capacitySamples: unknown[] = [];
      const completedCandidates = uniqueIssues.filter((issue) => {
        const stage = resolveWorkflowStage(
          resolveWorkflowProfile(issue),
          issue.currentStatus || '',
        );
        return stage.isCompletion;
      });
      for (const candidate of completedCandidates.slice(0, 12)) {
        let full = candidate;
        const hasStatusEvents = (candidate.events || []).some((event) => event.eventType === 'Status');
        if (!hasStatusEvents) {
          const raw = (await jira.fetchIssueByKey(candidate.issueKey)) as JiraIssuePayload;
          const history = (await jira.fetchAllChangelog(candidate.issueKey)) as unknown[];
          full = issueFromJira(raw, history);
        }
        const profile = resolveWorkflowProfile(full);
        const cycles = extractProfileContributorCycles(
          full,
          profile,
          fetchResult.reportData.params,
        ).filter((cycle) => cycle.completedAt);
        if (!cycles.length) continue;
        capacitySamples.push({
          key: full.issueKey,
          profile: profile.id,
          currentStatus: full.currentStatus,
          sequence: statusIntervals(full).map(
            (row) => `${row.status}→${row.canonical}${row.capacity ? '*cap' : ''}${row.review ? '*rev' : ''}${row.hold || row.waiting ? '*wait' : ''}`,
          ),
          intervals: statusIntervals(full),
          cycles: cycles.map((cycle) => ({
            startedAt: cycle.startedAt,
            completedAt: cycle.completedAt,
            firstPass: cycle.isFirstPass,
            backflow: cycle.hasBackflow,
            activeCapacityMs: cycle.activeCapacityMs,
            activeCapacityMsInPeriod: cycle.activeCapacityMsInPeriod,
          })),
        });
        if (capacitySamples.length >= 3) break;
      }
      console.info(JSON.stringify({ capacitySamples }));

      const coverage = resolveRequiredComparisonCoverage(range);
      const historyState = getTeamTrendHistoryState(fetchResult.kpiSnapshots);
      const completedPoints = teamTrendPoints(fetchResult.kpiSnapshots, 'completedOnDate');
      const firstPassPoints = teamTrendPoints(fetchResult.kpiSnapshots, 'firstPassOnDate');
      const backflowPoints = teamTrendPoints(fetchResult.kpiSnapshots, 'backflowsOnDate');
      const cycleSumPoints = teamTrendPoints(fetchResult.kpiSnapshots, 'cycleMsSumOnDate');
      const cycleCountPoints = teamTrendPoints(
        fetchResult.kpiSnapshots,
        'completedWithCycleOnDate',
      );
      const completedTrend = compareTrendPeriodsForDisplayRange(
        completedPoints,
        'completed',
        range,
      );
      const firstPassTrend = compareWeightedFirstPassTrend(
        completedPoints,
        firstPassPoints,
        Math.max(1, Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1),
        new Date(`${range.to}T12:00:00`),
      );
      const avgCycleTrend = compareWeightedAvgCycleTrend(
        cycleSumPoints,
        cycleCountPoints,
        Math.max(1, Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1),
        new Date(`${range.to}T12:00:00`),
      );
      const backflowTrend = compareTrendPeriodsForDisplayRange(
        backflowPoints,
        'backflows',
        range,
      );
      const comparison = previousComparableRange(range);
      const completedSufficiency = trendSufficiencyForDisplayRange(completedPoints, range);
      const coveredDays = fetchResult.kpiSnapshots.teamSnapshots.filter(
        (snapshot) => snapshot.source === 'historical_jira' || snapshot.source === 'live_daily',
      ).length;
      const genericEmpty =
        !historyState.canShowTrends &&
        coveredDays > 30 &&
        (fetchResult.kpiSnapshots.historicalCoverage?.bootstrapStatus === 'complete');

      const history = {
        displayFrom: range.from,
        displayTo: range.to,
        previousFrom: comparison.from,
        previousTo: comparison.to,
        fetchFrom: coverage.requiredFetchStart,
        fetchTo: coverage.requiredFetchEnd,
        historicalCoverage: {
          start: fetchResult.kpiSnapshots.historicalCoverage?.coverageStart ?? null,
          end: fetchResult.kpiSnapshots.historicalCoverage?.coverageEnd ?? null,
          bootstrapStatus: fetchResult.kpiSnapshots.historicalCoverage?.bootstrapStatus ?? null,
        },
        teamSnapshotDays: coveredDays,
        completed: {
          current: completedTrend.current,
          previous: completedTrend.previous,
          currentSampleDays: completedSufficiency.daysRecorded,
          previousSampleDays: completedSufficiency.previousDaysRecorded,
          sufficient: completedTrend.sufficient,
          reason: completedTrend.sufficiencyMessage,
        },
        firstPass: {
          current: firstPassTrend.current,
          previous: firstPassTrend.previous,
          sufficient: firstPassTrend.sufficient,
          reason: firstPassTrend.sufficiencyMessage,
        },
        avgCycle: {
          current: avgCycleTrend.current,
          previous: avgCycleTrend.previous,
          sufficient: avgCycleTrend.sufficient,
          reason: avgCycleTrend.sufficiencyMessage,
        },
        backflows: {
          current: backflowTrend.current,
          previous: backflowTrend.previous,
          sufficient: backflowTrend.sufficient,
          reason: backflowTrend.sufficiencyMessage,
        },
        canShowTrends: historyState.canShowTrends,
        historyMessage: historyState.message,
        bootstrapRan: fetchResult.historicalBootstrapRan,
      };
      console.info(JSON.stringify({ history }));
      expect(genericEmpty, '6m must not collapse to four generic empty cards when Jira history exists').toBe(
        false,
      );

      const self =
        persons.find(
          (person) =>
            person.bamboo.workEmail.toLowerCase() === workEmail.toLowerCase() ||
            person.jira?.email.toLowerCase() === workEmail.toLowerCase(),
        ) ?? persons[0];
      const vm = buildPerformanceViewModels(fetchResult, self.id, '6m', range, 'team');
      const insufficientCards = vm.teamOverview.trends.filter((card) => card.insufficientHistory);
      console.info(
        JSON.stringify({
          trendCards: vm.teamOverview.trends.map((card) => ({
            label: card.label,
            insufficientHistory: card.insufficientHistory,
            value: card.value,
          })),
        }),
      );
      if (historyState.canShowTrends && coveredDays >= 60) {
        expect(insufficientCards.length).toBeLessThan(4);
      }

      const sampleIssue =
        getOperationalIssues(self)[0] ||
        uxSample ||
        activeSample ||
        uniqueIssues[0];
      expect(sampleIssue).toBeTruthy();
      const sampleKey = sampleIssue!.issueKey;
      const sampleStatus = sampleIssue!.currentStatus || '';

      const owners = persons.filter((person) =>
        getOperationalIssues(person).some((issue) => issue.issueKey === sampleKey),
      );
      expect(owners.length).toBeLessThanOrEqual(1);

      const catalogIssue = catalog.get(sampleKey);
      expect(catalogIssue?.currentStatus || '').toBe(sampleStatus);

      const radarHit = (await import('../radar/teamRadar')).buildTeamRadar(
        fetchResult.teamSnapshot,
        fetchResult.reportData.params,
      );
      for (const item of radarHit) {
        for (const key of item.relatedIssueKeys) {
          const issue = catalog.get(key);
          if (!issue) continue;
          expect(issue.issueKey).toBe(key);
        }
      }

      const delivery = (await import('../radar/deliveryRisk')).buildDeliveryRiskItems(
        fetchResult.teamSnapshot,
        fetchResult.reportData.params,
      );
      for (const item of delivery) {
        expect(item.issue.issueKey).toBe(item.issueKey);
        expect(item.status).toBe(item.issue.currentStatus || item.status);
      }

      const week = buildMyWeek(self, fetchResult.reportData.params);
      const weekIssue = [...week.inProgress, ...week.inReview, ...week.completedThisWeek].find(
        (issue) => issue.issueKey === sampleKey,
      );
      if (weekIssue) {
        expect(weekIssue.currentStatus).toBe(sampleStatus);
      }

      const personDetailRows = buildTaskListModalRowsFromIssueKeys(
        [sampleKey],
        persons,
        jiraBase,
        catalog,
      );
      expect(personDetailRows[0].issueKey).toBe(sampleKey);
      expect(personDetailRows[0].status).toBe(sampleStatus || '—');
      expect(personDetailRows[0].jiraUrl).toBe(buildJiraIssueBrowseUrl(jiraBase, sampleKey));

      console.info(
        JSON.stringify({
          consistency: {
            sampleKey,
            status: sampleStatus,
            uniqueOwners: owners.length,
            catalogStatus: catalogIssue?.currentStatus ?? null,
            modalStatus: personDetailRows[0].status,
          },
        }),
      );
    },
    600_000,
  );
});
