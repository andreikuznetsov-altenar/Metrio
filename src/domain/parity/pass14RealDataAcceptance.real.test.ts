import { describe, expect, it, vi } from 'vitest';
import { createPerformanceDateRange, previousComparableRange } from '../performance/performanceDateRange';
import { resolveRequiredComparisonCoverage } from '../history/historyRanges';
import { getTeamTrendHistoryState } from '../trends/teamTrendHistory';
import { compareTrendPeriodsForDisplayRange } from '../trends/trendEngine';
import { teamTrendPoints } from '../snapshots/snapshotEngine';
import { buildIssueCatalog } from '../jira/issueCatalog';
import { collectUniqueTeamIssues } from '../jira/uniqueIssues';
import { assertUniqueCurrentOwnership, getOperationalIssues } from '../people/ownedIssues';
import { buildTaskListModalRowsFromIssueKeys } from '../actions/buildTaskListModalRows';
import { buildJiraIssueBrowseUrl } from '../../platform/jiraIssueUrl';
import { resolveJiraBaseUrl } from '../../config/product';
import { buildIssueEvents } from '../jira/events';
import type { AuditIssue } from '../jira/types';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
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
      const statusEvents = agtcIssue.events.filter((event) => event.eventType === 'Status');
      // Changelog is populated when Jira returns histories; empty is allowed only if Jira has none.
      console.info(
        JSON.stringify({
          agtc105: {
            key: agtcIssue.issueKey,
            titlePopulated: Boolean(agtcIssue.issueSummary),
            status: agtcIssue.currentStatus,
            created: agtcIssue.issueCreated,
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
      expect(modalRows[0].status).toBe(agtcIssue.currentStatus);
      expect(modalRows[0].createdAt).toBe(agtcIssue.issueCreated);
      expect(modalRows[0].jiraUrl).toBe(buildJiraIssueBrowseUrl(jiraBase, 'AGTC-105'));
      if (statusEvents.length > 0) {
        expect(modalRows[0].lastStatusChangedAt).toBeTruthy();
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

      const workloadTable = persons.map((person) => {
        const w = person.workload;
        const owned = getOperationalIssues(person);
        const ownedKeys = owned.map((issue) => issue.issueKey);
        expect(new Set(ownedKeys).size).toBe(ownedKeys.length);
        const reviewInActive = owned.filter((issue) => {
          const stage = resolveWorkflowStage(
            resolveWorkflowProfile(issue),
            issue.currentStatus || '',
          );
          return stage.countsAsReview && stage.countsAsActiveWork;
        });
        expect(reviewInActive, `${person.bamboo.displayName} review counted as active`).toEqual([]);
        if ((w?.activeWorkCount ?? 0) === 0) {
          expect(w?.capacityBreakdown?.activeSegmentHours ?? 0).toBe(0);
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
          activeWorkCount: w?.activeWorkCount ?? 0,
          reviewCount: w?.reviewCount ?? 0,
          qaCount: w?.qaCount ?? 0,
          holdCount: w?.holdCount ?? 0,
          waitingCount: w?.waitingCount ?? 0,
          capacityLoadPercent: w?.capacityLoadPercent ?? 0,
          capacityDataState: w?.capacityDataState ?? 'insufficient_history',
          workloadLevel: w?.level ?? 'low',
          completedCyclesInPeriod: w?.capacityBreakdown?.completedCyclesInPeriod ?? 0,
          avgHoursPerCycle: w?.capacityBreakdown?.avgHoursPerCycle ?? 0,
          daysInPeriod: w?.capacityBreakdown?.daysInPeriod ?? 0,
          estimatedMonthlyHours: w?.capacityBreakdown?.estimatedMonthlyHours ?? 0,
          completedCycleHours: w?.capacityBreakdown?.completedCycleHours ?? 0,
          activeSegmentHours: w?.capacityBreakdown?.activeSegmentHours ?? 0,
          ownedIssueCount: ownedKeys.length,
        };
      });
      console.info(JSON.stringify({ workloadTable }));

      const coverage = resolveRequiredComparisonCoverage(range);
      const historyState = getTeamTrendHistoryState(fetchResult.kpiSnapshots);
      const completedPoints = teamTrendPoints(fetchResult.kpiSnapshots, 'completedOnDate');
      const firstPassPoints = teamTrendPoints(fetchResult.kpiSnapshots, 'firstPassOnDate');
      const backflowPoints = teamTrendPoints(fetchResult.kpiSnapshots, 'backflowsOnDate');
      const completedTrend = compareTrendPeriodsForDisplayRange(
        completedPoints,
        'completed',
        range,
      );
      const firstPassTrend = compareTrendPeriodsForDisplayRange(
        firstPassPoints,
        'firstPass',
        range,
      );
      const backflowTrend = compareTrendPeriodsForDisplayRange(
        backflowPoints,
        'backflows',
        range,
      );
      const comparison = previousComparableRange(range);
      const coveredDays = fetchResult.kpiSnapshots.teamSnapshots.filter(
        (snapshot) => snapshot.source === 'historical_jira' || snapshot.source === 'live_daily',
      ).length;
      const genericEmpty =
        !historyState.canShowTrends &&
        coveredDays > 30 &&
        (fetchResult.kpiSnapshots.historicalCoverage?.bootstrapStatus === 'complete');

      const history = {
        displayRange: range,
        comparisonRange: comparison,
        historicalCoverage: fetchResult.kpiSnapshots.historicalCoverage,
        coveredDays,
        completedCurrent: completedTrend.current,
        completedPrevious: completedTrend.previous,
        firstPassSamples: firstPassTrend.current,
        firstPassSufficient: firstPassTrend.sufficient,
        firstPassMessage: firstPassTrend.sufficiencyMessage,
        backflowsCurrent: backflowTrend.current,
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
