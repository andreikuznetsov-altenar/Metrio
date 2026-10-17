import { firstPassPercentFromCounts, reworkRateMetric } from '../../domain/performance/reworkRate';
import { format, parseISO } from 'date-fns';
import { firstPassPercent, personActiveCount, personAtRiskCount, personProblematicCount, personRouteKey } from '../../domain/people/personDisplay';
import { buildTeamDigestSections } from '../../domain/digests/weeklyDigest';
import type { AuditReportData } from '../../domain/jira/types';
import { buildMyWeek } from '../../domain/personal/myWeek';
import { buildWorkHistory } from '../../domain/personal/workHistory';
import type { TeamSnapshot } from '../../domain/people/types';
import { inclusiveRangeDayCount } from '../../domain/performance/performanceDateRange';
import { buildDeliveryRiskItems } from '../../domain/radar/deliveryRisk';
import { buildTeamRadar, summarizeTeamRadar } from '../../domain/radar/teamRadar';
import type { KpiSnapshotFile } from '../../domain/snapshots/types';
import {
  personDurationSamplePoints,
  personTrendPoints,
  teamDurationSamplePoints,
  teamSparklinePoints,
  teamTrendPoints,
} from '../../domain/snapshots/snapshotEngine';
import {
  compareTrendPeriods,
  compareMedianDurationTrend,
  compareWeightedReworkRateTrend,
  compareWeightedFirstPassTrend,
} from '../../domain/trends/trendEngine';
import { buildWorkloadBalance } from '../../domain/workload/workloadBalance';
import type { AppPreferences } from '../../platform/preferences';
import { resolveDisplayTimezone } from '../../platform/displayTimezone';
import { formatGeneratedTimestamp, formatUtcOffset } from '../../platform/timezone';
import { getHistoryCoverageSummary } from '../../services/history/historicalBootstrap';
import type { TeamPerformanceSnapshot } from '../../domain/performance';
import type { PerformanceExportPayload, PerformanceExportView, PdfSection, ReportRangeIso } from './types';
import { buildTeamPerformancePdfLayout } from './teamPerformancePdfModel';

import { appNow } from "../../platform/appClock";
function formatRange(from: string, to: string): string {
  const fmt = (iso: string) => {
    if (!iso) return '—';
    return format(parseISO(iso), 'dd/MM/yyyy');
  };
  return `${fmt(from)} - ${fmt(to)}`;
}

const REPORT_TITLES: Record<PerformanceExportView, string> = {
  'team-overview': 'Team Performance Report',
  'team-radar': 'Team Radar',
  'team-people': 'Team People',
  'team-delivery-risk': 'Delivery Risk',
  'personal-my-week': 'My Week',
  'personal-trends': 'My Trends',
  'personal-work-history': 'Work History',
};

function buildTeamOverviewSections(
  snapshot: TeamSnapshot,
  reportData: AuditReportData,
  kpiSnapshots: KpiSnapshotFile,
  firstPassMetrics: { official: { firstPassRatePercent: number } } | null,
): PdfSection[] {
  const params = reportData.params;
  const radar = buildTeamRadar(snapshot, params);
  const radarSummary = summarizeTeamRadar(radar);
  const deliveryRisk = buildDeliveryRiskItems(snapshot, params);
  const digest = buildTeamDigestSections(snapshot, reportData, radar, kpiSnapshots);

  const attentionRows = radar.slice(0, 5).flatMap((item) => [
    {
      cells: [item.personName, `${item.signalCount} signals`, item.signals[0]?.label || '—'],
    },
    ...(item.signals[1]
      ? [{ cells: ['', '', item.signals[1].label] }]
      : []),
  ]);

  const throughput = reportData.teamKpi.throughputCount ?? reportData.teamKpi.completedCount;
  const firstPass =
    firstPassPercentFromCounts(reportData.teamKpi) ?? firstPassMetrics?.official.firstPassRatePercent ?? 0;
  const trendDays = inclusiveRangeDayCount(params.dateFrom, params.dateTo);
  const trendAnchor = new Date(`${params.dateTo}T12:00:00`);

  const completedTrend = compareTrendPeriods(teamTrendPoints(kpiSnapshots, 'completedOnDate'), 'completed', trendDays, trendAnchor);
  const firstPassTrend = compareWeightedFirstPassTrend(
    teamTrendPoints(kpiSnapshots, 'completedOnDate'),
    teamTrendPoints(kpiSnapshots, 'firstPassOnDate'),
    trendDays,
    trendAnchor,
  );
  const avgCycleTrend = compareMedianDurationTrend(
    teamDurationSamplePoints(kpiSnapshots, 'cycle'),
    'cycleTime',
    trendDays,
    trendAnchor,
  );
  const reworkRateTrend = compareWeightedReworkRateTrend(
    teamTrendPoints(kpiSnapshots, 'completedOnDate'),
    teamTrendPoints(kpiSnapshots, 'reworkedCyclesOnDate'),
    trendDays,
    trendAnchor,
  );
  const backflowTrend = compareTrendPeriods(teamTrendPoints(kpiSnapshots, 'backflowsOnDate'), 'backflows', trendDays, trendAnchor);
  const sparklineNote =
    teamSparklinePoints(kpiSnapshots, 'completedOnDate', trendDays, trendAnchor).length > 0
      ? 'Sparkline data available in app'
      : undefined;

  const workload = buildWorkloadBalance(snapshot, personRouteKey, {
    active: (p) => personActiveCount(p, params),
    atRisk: (p) => personAtRiskCount(p, params),
    problematic: (p) => personProblematicCount(p, params),
  });

  const sections: PdfSection[] = [
    {
      title: 'Team attention',
      subtitle: `${radarSummary.peopleNeedingAttention} people need attention · ${deliveryRisk.length} tasks at risk · ${snapshot.summary.vacationSoon} vacation soon`,
      emptyText: 'No team issues need attention right now.',
      rowHeaders: ['Person', 'Signals', 'Top signal'],
      rows: attentionRows,
    },
    {
      title: 'KPI overview',
      subtitle: `${snapshot.summary.available} available · ${snapshot.summary.onVacation} on vacation · ${snapshot.summary.heavyOrOverloaded} Heavy / Overloaded · ${snapshot.summary.problematic} problematic tasks`,
      keyValues: [
        { label: 'Throughput', value: String(throughput) },
        { label: 'First Pass rate', value: `${firstPass}%` },
        { label: 'Completed', value: String(reportData.teamKpi.completedCount) },
        { label: 'Rework Rate', value: reworkRateMetric(reportData.teamKpi).value },
        { label: 'Reworked cycles', value: String(reportData.teamKpi.reworkedCycleCount) },
        { label: 'Backflow Events', value: String(reportData.teamKpi.backflowEventCount) },
      ],
    },
    {
      title: 'Team Trends',
      subtitle: 'Current 4 weeks vs previous 4 weeks',
      keyValues: [
        {
          label: 'Completed',
          value: completedTrend.sufficient
            ? `${Math.round(completedTrend.current)} (${completedTrend.label})`
            : completedTrend.sufficiencyMessage || '—',
        },
        {
          label: 'First Pass',
          value: firstPassTrend.sufficient
            ? `${firstPassTrend.current.toFixed(0)}% (${firstPassTrend.label})`
            : firstPassTrend.sufficiencyMessage || '—',
        },
        {
          label: 'Rework Rate',
          value: reworkRateTrend.sufficient
            ? `${reworkRateTrend.current.toFixed(0)}% (${reworkRateTrend.label})`
            : reworkRateTrend.sufficiencyMessage || '—',
        },
        {
          label: 'Cycle Time (median)',
          value: avgCycleTrend.sufficient
            ? `${avgCycleTrend.current.toFixed(1)} business days (${avgCycleTrend.label})`
            : avgCycleTrend.sufficiencyMessage || '—',
        },
        {
          label: 'Backflow Events',
          value: backflowTrend.sufficient
            ? `${Math.round(backflowTrend.current)} (${backflowTrend.label})`
            : backflowTrend.sufficiencyMessage || '—',
        },
      ],
      emptyText: kpiSnapshots.teamSnapshots.length === 0 ? 'No historical trend data available.' : undefined,
    },
    {
      title: 'Workload Balance',
      subtitle: workload.insights.find((insight) => insight.type === 'highest_workload')?.message,
      rowHeaders: ['Person', 'Current workload', 'Active', 'At risk', 'Level'],
      rows: workload.rows.map((row) => ({
        cells: [
          row.personName,
          row.currentLoadPercent === null ? '—' : `${Math.round(row.currentLoadPercent)}%`,
          String(row.activeCount),
          String(row.atRiskCount),
          row.level,
        ],
      })),
    },
  ];

  for (const column of digest) {
    sections.push({
      title: `Team digest — ${column.title}`,
      keyValues: column.rows.map((row) => ({ label: row.label, value: row.value })),
    });
  }

  if (sparklineNote && kpiSnapshots.teamSnapshots.length > 0) {
    sections[2].subtitle = `${sections[2].subtitle || ''}`.trim();
  }

  return sections;
}

export function buildPerformanceExportData(input: {
  view: PerformanceExportView;
  snapshot: TeamSnapshot;
  reportData: AuditReportData;
  kpiSnapshots: KpiSnapshotFile;
  firstPassMetrics: { official: { firstPassRatePercent: number } } | null;
  prefs: AppPreferences;
  historyPerson?: TeamSnapshot['persons'][number];
  workHistoryPeriod?: 'week' | 'month' | 'quarter';
  teamScopeLabel?: string;
  historyReportData?: AuditReportData;
  generatedAt?: Date;
  teamOverview?: TeamPerformanceSnapshot;
  companyLogo?: { src: string; source: string };
  avatarDataUrls?: Record<string, string | null>;
}): PerformanceExportPayload {
  const { view, snapshot, reportData, kpiSnapshots, firstPassMetrics, prefs, historyPerson, workHistoryPeriod } =
    input;
  const generatedAt = input.generatedAt ?? appNow();
  const params = reportData.params;
  const timezone = resolveDisplayTimezone(prefs.appearance.displayTimezone);
  const person = snapshot.persons[0];

  const metadata: PerformanceExportPayload['metadata'] = {
    reportRange: formatRange(params.dateFrom, params.dateTo),
    generatedAt: formatGeneratedTimestamp(generatedAt),
    timezone,
    timezoneOffset: formatUtcOffset(generatedAt, timezone),
    targetReviewDays: params.targetReviewDays,
    teamScope:
      input.teamScopeLabel ??
      (snapshot.mode === 'team'
        ? prefs.reportFilters.teamScope === 'direct'
          ? 'Direct reports only'
          : 'Full reporting tree'
        : undefined),
    projects: params.projects.length ? params.projects.join(', ') : undefined,
    personName: person?.bamboo.displayName,
    workHistoryGrouping: workHistoryPeriod
      ? workHistoryPeriod.charAt(0).toUpperCase() + workHistoryPeriod.slice(1)
      : undefined,
  };

  const reportRange: ReportRangeIso = {
    from: params.dateFrom,
    to: params.dateTo,
  };

  let sections: PdfSection[] = [];
  let teamLayout: PerformanceExportPayload['teamLayout'];

  if (view === 'team-overview' && input.teamOverview && input.companyLogo) {
    teamLayout = buildTeamPerformancePdfLayout({
      reportRange,
      teamOverview: input.teamOverview,
      teamSnapshot: snapshot,
      reportData,
      kpiSnapshots,
      companyLogoSrc: input.companyLogo.src,
      companyLogoSource: input.companyLogo.source,
      avatarDataUrls: input.avatarDataUrls,
    });
  } else if (view === 'team-overview') {
    sections = buildTeamOverviewSections(snapshot, reportData, kpiSnapshots, firstPassMetrics);
  } else if (view === 'team-radar') {
    const radar = buildTeamRadar(snapshot, reportData.params);
    sections = [
      {
        title: 'Team Radar',
        emptyText: 'No team issues need attention right now.',
        rowHeaders: ['Person', 'Severity', 'Signals'],
        rows: radar.map((item) => ({
          cells: [
            item.personName,
            item.severity,
            item.signals.slice(0, 4).map((s) => s.label).join('; ') || '—',
          ],
        })),
      },
    ];
  } else if (view === 'team-people') {
    sections = [
      {
        title: 'Team members',
        rowHeaders: ['Person', 'Throughput', 'First Pass', 'Active', 'Problematic'],
        rows: snapshot.persons.map((p) => ({
          cells: [
            p.bamboo.displayName,
            String(p.performance?.throughputCount ?? p.performance?.completedCount ?? '—'),
            `${firstPassPercent(p)}%`,
            String(personActiveCount(p, reportData.params)),
            String(personProblematicCount(p, reportData.params)),
          ],
        })),
      },
    ];
  } else if (view === 'team-delivery-risk') {
    const items = buildDeliveryRiskItems(snapshot, reportData.params);
    sections = [
      {
        title: 'Delivery Risk',
        emptyText: 'No delivery risks in the selected period.',
        rowHeaders: ['Task', 'Person', 'Status', 'Reason'],
        rows: items.map((item) => ({
          cells: [item.issueKey, item.personName, item.status, item.reason],
        })),
      },
    ];
  } else if (view === 'personal-my-week' && person) {
    const week = buildMyWeek(person, reportData.params, generatedAt);
    const throughput = person.performance?.throughputCount ?? person.performance?.completedCount ?? '—';
    const firstPass = firstPassPercent(person);
    sections = [
      {
        title: 'My Week',
        keyValues: [
          { label: 'Completed this week', value: String(week.summary.completedThisWeek) },
          { label: 'Currently active', value: String(week.summary.currentlyActive) },
          { label: 'At risk', value: String(week.summary.atRisk) },
          { label: 'In review', value: String(week.summary.inReview) },
          { label: 'Backflow Events this week', value: String(week.summary.backflowsThisWeek) },
        ],
      },
      {
        title: 'Needs attention',
        emptyText: 'Nothing needs attention right now.',
        rowHeaders: ['Task', 'Status', 'Reason'],
        rows: week.needsAttention.map((task) => ({
          cells: [task.issueKey, task.status, task.reason],
        })),
      },
      {
        title: 'In progress',
        emptyText: 'None',
        rowHeaders: ['Task', 'Summary', 'Status'],
        rows: week.inProgress.map((issue) => ({
          cells: [issue.issueKey, issue.issueSummary, issue.currentStatus || '—'],
        })),
      },
      {
        title: 'In review',
        emptyText: 'None',
        rowHeaders: ['Task', 'Summary', 'Status'],
        rows: week.inReview.map((issue) => ({
          cells: [issue.issueKey, issue.issueSummary, issue.currentStatus || '—'],
        })),
      },
      {
        title: 'Completed this week',
        emptyText: 'None',
        rowHeaders: ['Task', 'Summary', 'Status'],
        rows: week.completedThisWeek.map((issue) => {
          // The count above is completed cycles; an issue completed more than once says so.
          const completions = week.completedCycleCounts[issue.issueKey] ?? 1;
          const summary = completions > 1 ? `${issue.issueSummary} (${completions} completions)` : issue.issueSummary;
          return { cells: [issue.issueKey, summary, issue.currentStatus || '—'] };
        }),
      },
      {
        title: 'KPI detail',
        keyValues: [
          { label: 'Throughput', value: String(throughput) },
          { label: 'First Pass', value: `${firstPass}%` },
          { label: 'Completed (range)', value: String(person.performance?.completedCount ?? 0) },
          { label: 'Reworked cycles (range)', value: String(person.performance?.reworkedCycleCount ?? 0) },
          { label: 'Backflow Events (range)', value: String(person.performance?.backflowEventCount ?? 0) },
        ],
      },
    ];
  } else if (view === 'personal-trends' && person) {
    const coverage = getHistoryCoverageSummary(kpiSnapshots);
    if (coverage) metadata.historyCoverage = coverage.label;
    const completed = personTrendPoints(kpiSnapshots, person.id, 'completedOnDate');
    const firstPass = personTrendPoints(kpiSnapshots, person.id, 'firstPassOnDate');
    const reworked = personTrendPoints(kpiSnapshots, person.id, 'reworkedCyclesOnDate');
    const backflows = personTrendPoints(kpiSnapshots, person.id, 'backflowsOnDate');
    const hasHistory = kpiSnapshots.personSnapshots.some((s) => s.personId === person.id);
    const trendDays = inclusiveRangeDayCount(reportData.params.dateFrom, reportData.params.dateTo);
    const trendAnchor = new Date(`${reportData.params.dateTo}T12:00:00`);
    const completedTrend = compareTrendPeriods(completed, 'completed', trendDays, trendAnchor);
    const firstPassTrend = compareWeightedFirstPassTrend(
      completed,
      firstPass,
      trendDays,
      trendAnchor,
    );
    const avgCycleTrend = compareMedianDurationTrend(
      personDurationSamplePoints(kpiSnapshots, person.id, 'cycle'),
      'cycleTime',
      trendDays,
      trendAnchor,
    );
    const reworkRateTrend = compareWeightedReworkRateTrend(
      completed,
      reworked,
      trendDays,
      trendAnchor,
    );
    const backflowTrend = compareTrendPeriods(backflows, 'backflows', trendDays, trendAnchor);

    sections = [
      {
        title: 'My Trends',
        subtitle: coverage ? `History coverage: ${coverage.label}` : 'Last 8 weeks · current 4 weeks vs previous 4 weeks',
        emptyText: hasHistory ? undefined : 'No historical trend data available.',
        keyValues: hasHistory
          ? [
              {
                label: 'Completed',
                value: completedTrend.sufficient
                  ? `${Math.round(completedTrend.current)} (${completedTrend.label})`
                  : '—',
              },
              {
                label: 'First Pass',
                value: firstPassTrend.sufficient
                  ? `${firstPassTrend.current.toFixed(0)}%`
                  : '—',
              },
              {
                label: 'Rework Rate',
                value: reworkRateTrend.sufficient
                  ? `${reworkRateTrend.current.toFixed(0)}%`
                  : '—',
              },
              {
                label: 'Cycle Time (median)',
                value: avgCycleTrend.sufficient
                  ? `${avgCycleTrend.current.toFixed(1)} business days`
                  : '—',
              },
              {
                label: 'Backflow Events',
                value: backflowTrend.sufficient
                  ? String(Math.round(backflowTrend.current))
                  : '—',
              },
            ]
          : [],
      },
    ];
  } else if (view === 'personal-work-history' && person) {
    const source = historyPerson || person;
    const period = workHistoryPeriod || 'month';
    const historyParams = input.historyReportData?.params ?? reportData.params;
    const groups = buildWorkHistory(source, historyParams, period);
    sections = [
      {
        title: 'Work History',
        subtitle: `Grouped by ${period}`,
        emptyText: 'No completed tasks in this period.',
        rows: groups.flatMap((group) => [
          { cells: [group.label, `${group.completedCount} completed`, `${group.firstPassCount} first-pass`] },
          ...group.entries.map((entry) => ({
            cells: [entry.issueKey, entry.summary, entry.project],
          })),
        ]),
      },
    ];
  }

  return {
    view,
    reportTitle: REPORT_TITLES[view],
    reportRange,
    teamLayout,
    metadata,
    sections,
  };
}
