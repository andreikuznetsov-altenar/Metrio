import { format, parseISO } from 'date-fns';
import { firstPassPercent, personActiveCount, personAtRiskCount, personProblematicCount, personRouteKey } from '../../domain/people/personDisplay';
import { buildTeamDigestSections } from '../../domain/digests/weeklyDigest';
import { getEfficiencyStatus } from '../../domain/jira/kpi';
import type { AuditReportData } from '../../domain/jira/types';
import { buildMyWeek } from '../../domain/personal/myWeek';
import { buildWorkHistory } from '../../domain/personal/workHistory';
import type { TeamSnapshot } from '../../domain/people/types';
import { buildDeliveryRiskItems } from '../../domain/radar/deliveryRisk';
import { buildTeamRadar, summarizeTeamRadar } from '../../domain/radar/teamRadar';
import type { KpiSnapshotFile } from '../../domain/snapshots/types';
import { teamSparklinePoints, teamTrendPoints, personTrendPoints } from '../../domain/snapshots/snapshotEngine';
import {
  compareTrendPeriods,
  compareWeightedAvgCycleTrend,
  compareWeightedFirstPassTrend,
} from '../../domain/trends/trendEngine';
import { buildWorkloadBalance } from '../../domain/workload/workloadBalance';
import type { AppPreferences } from '../../platform/preferences';
import { resolveDisplayTimezone } from '../../platform/displayTimezone';
import { formatGeneratedTimestamp, formatUtcOffset } from '../../platform/timezone';
import { getHistoryCoverageSummary } from '../../services/history/historicalBootstrap';
import type { PerformanceExportPayload, PerformanceExportView, PdfSection } from './types';

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

  const efficiency = reportData.teamKpi.efficiencyIndex;
  const firstPass = firstPassMetrics?.official.firstPassRatePercent ?? 0;

  const completedTrend = compareTrendPeriods(teamTrendPoints(kpiSnapshots, 'completedOnDate'), 'completed', 28);
  const firstPassTrend = compareWeightedFirstPassTrend(
    teamTrendPoints(kpiSnapshots, 'completedOnDate'),
    teamTrendPoints(kpiSnapshots, 'firstPassOnDate'),
    28,
  );
  const avgCycleTrend = compareWeightedAvgCycleTrend(
    teamTrendPoints(kpiSnapshots, 'cycleMsSumOnDate'),
    teamTrendPoints(kpiSnapshots, 'completedWithCycleOnDate'),
    28,
  );
  const backflowTrend = compareTrendPeriods(teamTrendPoints(kpiSnapshots, 'backflowsOnDate'), 'backflows', 28);
  const sparklineNote =
    teamSparklinePoints(kpiSnapshots, 'completedOnDate').length > 0
      ? 'Sparkline data available in app'
      : undefined;

  const workload = buildWorkloadBalance(snapshot, personRouteKey, {
    active: (p) => personActiveCount(p, params),
    atRisk: (p) => personAtRiskCount(p, params),
    problematic: (p) => personProblematicCount(p, params),
  });

  const upcoming = snapshot.persons.filter(
    (p) => p.availability.state === 'vacation_soon' || p.availability.state === 'vacation_tomorrow',
  );

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
      subtitle: `${snapshot.summary.available} available · ${snapshot.summary.onVacation} on vacation · ${snapshot.summary.highWorkload} high workload · ${snapshot.summary.problematic} problematic tasks`,
      keyValues: [
        { label: 'Efficiency', value: `${efficiency} (${getEfficiencyStatus(efficiency)})` },
        { label: 'First pass rate', value: `${firstPass}%` },
        { label: 'Completed', value: String(reportData.teamKpi.completedCount) },
        { label: 'Backflows', value: String(reportData.teamKpi.backflowCount) },
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
          label: 'Avg cycle',
          value: avgCycleTrend.sufficient
            ? `${avgCycleTrend.current.toFixed(1)} days (${avgCycleTrend.label})`
            : avgCycleTrend.sufficiencyMessage || '—',
        },
        {
          label: 'Backflows',
          value: backflowTrend.sufficient
            ? `${Math.round(backflowTrend.current)} (${backflowTrend.label})`
            : backflowTrend.sufficiencyMessage || '—',
        },
      ],
      emptyText: kpiSnapshots.teamSnapshots.length === 0 ? 'No historical trend data available.' : undefined,
    },
    {
      title: 'Workload Balance',
      subtitle: workload.rows[0]
        ? `${workload.rows[0].personName} has the highest active workload in the team.`
        : undefined,
      rowHeaders: ['Person', 'Active', 'At risk', 'Workload'],
      rows: workload.rows.map((row) => ({
        cells: [row.personName, String(row.activeCount), String(row.atRiskCount), row.level],
      })),
    },
    {
      title: 'Upcoming time off',
      subtitle: 'Next 14 days',
      emptyText: 'No upcoming time off in the next 14 days.',
      rowHeaders: ['Person', 'Dates', 'Duration', 'Type'],
      rows: upcoming.map((person) => ({
        cells: [
          person.bamboo.displayName,
          person.availability.startDate || 'Soon',
          person.availability.endDate || '—',
          person.availability.isHoliday ? 'Holiday' : 'Vacation',
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
}): PerformanceExportPayload {
  const { view, snapshot, reportData, kpiSnapshots, firstPassMetrics, prefs, historyPerson, workHistoryPeriod } =
    input;
  const generatedAt = input.generatedAt ?? new Date();
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

  let sections: PdfSection[] = [];

  if (view === 'team-overview') {
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
        rowHeaders: ['Person', 'Efficiency', 'First pass', 'Active', 'Problematic'],
        rows: snapshot.persons.map((p) => ({
          cells: [
            p.bamboo.displayName,
            String(p.performance?.efficiencyIndex ?? '—'),
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
    const efficiency = person.performance?.efficiencyIndex ?? '—';
    const firstPass = firstPassPercent(person);
    sections = [
      {
        title: 'My Week',
        keyValues: [
          { label: 'Completed this week', value: String(week.summary.completedThisWeek) },
          { label: 'Currently active', value: String(week.summary.currentlyActive) },
          { label: 'At risk', value: String(week.summary.atRisk) },
          { label: 'In review', value: String(week.summary.inReview) },
          { label: 'Backflows this week', value: String(week.summary.backflowsThisWeek) },
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
        rows: week.completedThisWeek.map((issue) => ({
          cells: [issue.issueKey, issue.issueSummary, issue.currentStatus || '—'],
        })),
      },
      {
        title: 'KPI detail',
        keyValues: [
          { label: 'Efficiency', value: String(efficiency) },
          { label: 'First pass', value: `${firstPass}%` },
          { label: 'Completed (range)', value: String(person.performance?.completedCount ?? 0) },
          { label: 'Backflows (range)', value: String(person.performance?.backflowCount ?? 0) },
        ],
      },
    ];
  } else if (view === 'personal-trends' && person) {
    const coverage = getHistoryCoverageSummary(kpiSnapshots);
    if (coverage) metadata.historyCoverage = coverage.label;
    const completed = personTrendPoints(kpiSnapshots, person.id, 'completedOnDate');
    const firstPass = personTrendPoints(kpiSnapshots, person.id, 'firstPassOnDate');
    const cycleSum = personTrendPoints(kpiSnapshots, person.id, 'cycleMsSumOnDate');
    const completedWithCycle = personTrendPoints(kpiSnapshots, person.id, 'completedWithCycleOnDate');
    const backflows = personTrendPoints(kpiSnapshots, person.id, 'backflowsOnDate');
    const hasHistory = kpiSnapshots.personSnapshots.some((s) => s.personId === person.id);

    sections = [
      {
        title: 'My Trends',
        subtitle: coverage ? `History coverage: ${coverage.label}` : 'Last 8 weeks · current 4 weeks vs previous 4 weeks',
        emptyText: hasHistory ? undefined : 'No historical trend data available.',
        keyValues: hasHistory
          ? [
              {
                label: 'Completed',
                value: compareTrendPeriods(completed, 'completed', 28).sufficient
                  ? `${Math.round(compareTrendPeriods(completed, 'completed', 28).current)} (${compareTrendPeriods(completed, 'completed', 28).label})`
                  : '—',
              },
              {
                label: 'First Pass',
                value: compareWeightedFirstPassTrend(completed, firstPass, 28).sufficient
                  ? `${compareWeightedFirstPassTrend(completed, firstPass, 28).current.toFixed(0)}%`
                  : '—',
              },
              {
                label: 'Avg cycle',
                value: compareWeightedAvgCycleTrend(cycleSum, completedWithCycle, 28).sufficient
                  ? `${compareWeightedAvgCycleTrend(cycleSum, completedWithCycle, 28).current.toFixed(1)} days`
                  : '—',
              },
              {
                label: 'Backflows',
                value: compareTrendPeriods(backflows, 'backflows', 28).sufficient
                  ? String(Math.round(compareTrendPeriods(backflows, 'backflows', 28).current))
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
    metadata,
    sections,
  };
}
