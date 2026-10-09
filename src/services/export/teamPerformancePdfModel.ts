import { endOfDay, format, parseISO } from 'date-fns';
import { parseDateStartOfDay } from '../../domain/jira/dates';
import type { DateRange } from '../../domain/periods/dateRange';
import { buildDeliveryRiskItems } from '../../domain/radar/deliveryRisk';
import { buildTeamRadar, summarizeTeamRadar } from '../../domain/radar/teamRadar';
import type { TeamPerformanceSnapshot } from '../../domain/performance';
import type { TeamSnapshot } from '../../domain/people/types';
import type { AuditReportData } from '../../domain/jira/types';
import type { KpiSnapshotFile } from '../../domain/snapshots/types';
import { inclusiveRangeDayCount } from '../../domain/performance/performanceDateRange';
import { computeTeamFlowMetrics } from '../../domain/periods/issuePeriodMetrics';
import { personTrendFieldPoints } from '../../domain/snapshots/snapshotEngine';
import {
  compareTrendPeriods,
  compareTrendWithAggregation,
  compareWeightedFirstPassTrend,
  TREND_METRICS,
  trendSufficiency,
} from '../../domain/trends/trendEngine';
import type { TeamPerformancePdfLayout, ReportRangeIso } from './types';

function reportRangeToDateRange(range: ReportRangeIso): DateRange {
  const start = parseDateStartOfDay(range.from) ?? parseISO(range.from);
  const end = endOfDay(parseDateStartOfDay(range.to) ?? parseISO(range.to));
  return { start, end };
}

export function formatPdfReportRangeTitle(range: ReportRangeIso): string {
  const fmt = (iso: string) => format(parseISO(iso), 'd MMM yyyy');
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}

function severityLabel(severity: string): string {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Watch';
  return 'Stable';
}

export function buildTeamPerformancePdfLayout(input: {
  reportRange: ReportRangeIso;
  teamOverview: TeamPerformanceSnapshot;
  teamSnapshot: TeamSnapshot;
  reportData: AuditReportData;
  kpiSnapshots: KpiSnapshotFile;
  companyLogoSrc: string;
  companyLogoSource: string;
  avatarDataUrls?: Record<string, string | null>;
}): TeamPerformancePdfLayout {
  const { reportRange, teamOverview, teamSnapshot, reportData, kpiSnapshots } = input;
  const params = reportData.params;
  const trendDays = inclusiveRangeDayCount(reportRange.from, reportRange.to);
  const trendAnchor = new Date(`${reportRange.to}T12:00:00`);

  const periodFlow = computeTeamFlowMetrics(
    teamSnapshot.persons,
    reportRangeToDateRange(reportRange),
    params,
  );
  const radar = buildTeamRadar(teamSnapshot, params);
  const radarSummary = summarizeTeamRadar(radar);
  const deliveryRisk = buildDeliveryRiskItems(teamSnapshot, params);

  const avgCycleDays =
    periodFlow.avgCycleMs !== null
      ? (periodFlow.avgCycleMs / (24 * 60 * 60 * 1000)).toFixed(1)
      : '—';

  const digestSummary =
    `For the selected period (${formatPdfReportRangeTitle(reportRange)}), the team completed ${periodFlow.completedCount} items ` +
    `with ${periodFlow.firstPassPercent}% first pass, ${avgCycleDays} days average cycle, and ${periodFlow.backflowCount} backflows. ` +
    `${radarSummary.peopleNeedingAttention} people need attention; ${deliveryRisk.length} tasks are at delivery risk.`;

  const digestAttention = {
    title: 'Attention',
    rows: [
      {
        label: 'People need attention',
        value: String(radarSummary.peopleNeedingAttention ?? 0),
      },
      { label: 'Tasks at risk', value: String(deliveryRisk.length) },
      {
        label: 'High workload',
        value: String(teamSnapshot.summary.highWorkload ?? 0),
      },
      {
        label: 'Vacation soon',
        value: String(teamSnapshot.summary.vacationSoon ?? 0),
      },
    ],
  };

  const completedPoints = personTrendFieldPoints(kpiSnapshots, 'completedOnDate');
  const firstPassPoints = personTrendFieldPoints(kpiSnapshots, 'firstPassOnDate');
  const fpSufficiency = trendSufficiency(completedPoints, trendDays, trendAnchor);
  const recentRows: { label: string; value: string }[] = [];

  if (fpSufficiency.sufficient) {
    const fpTrend = compareWeightedFirstPassTrend(
      completedPoints,
      firstPassPoints,
      trendDays,
      trendAnchor,
    );
    recentRows.push({ label: 'First pass', value: fpTrend.label });
  } else {
    recentRows.push({
      label: 'First pass',
      value: `${fpSufficiency.daysRecorded}/${fpSufficiency.recommended} days`,
    });
  }

  const problematicPoints = personTrendFieldPoints(kpiSnapshots, 'problematicCount');
  const problematicTrend = compareTrendWithAggregation(
    problematicPoints,
    TREND_METRICS.problematic,
    trendDays,
    trendAnchor,
  );
  if (problematicTrend.sufficient) {
    recentRows.push({
      label: 'Problematic tasks',
      value: problematicTrend.label,
    });
  }

  const completedTrend = compareTrendPeriods(
    personTrendFieldPoints(kpiSnapshots, 'completedOnDate'),
    'completed',
    trendDays,
    trendAnchor,
  );
  if (completedTrend.sufficient) {
    recentRows.push({ label: 'Completed', value: completedTrend.label });
  }

  const digestRecentChanges = {
    title: 'Recent changes',
    rows: recentRows.length ? recentRows : [{ label: 'Changes', value: '—' }],
  };

  const kpiOverview = teamOverview.summary
    .filter((metric) =>
      ['Efficiency', 'First pass', 'Completed', 'Backflows'].includes(metric.label),
    )
    .map((metric) => ({
      label: metric.label,
      value: metric.value,
      description: metric.tooltip,
      comparison: metric.contextLabel,
    }));

  const teamAttentionRows = teamOverview.attention.map((row) => ({
    personId: row.personId,
    personName: row.personName ?? '—',
    bambooEmployeeId: teamSnapshot.persons.find((p) => p.id === row.personId)?.bamboo.id,
    attention: row.reason,
    issues: String(row.issueCount),
    severity: severityLabel(row.severity),
    workload: row.workload ?? '—',
    avatarDataUrl: input.avatarDataUrls?.[row.personId] ?? null,
  }));

  const teamTrends = teamOverview.trends.map((trend) => ({
    label: trend.label,
    value: trend.value,
    comparison: trend.trendMovementDirection
      ? `${trend.trendMovementDirection}`
      : undefined,
    chartPoints: (trend.chartSeries ?? []).map((point) => ({
      date: point.date,
      value: point.value,
    })),
  }));

  const workloadBalance = {
    subtitle: teamOverview.workload[0]
      ? `${teamOverview.workload[0].personName ?? 'Team member'} has the highest active workload.`
      : undefined,
    rows: teamOverview.workload.map((row) => ({
      personName: row.personName ?? '—',
      active: String(row.activeWork),
      atRisk: String(row.atRisk),
      workload: row.workload,
    })),
  };

  return {
    companyLogoSrc: input.companyLogoSrc,
    companyLogoSource: input.companyLogoSource,
    reportRange,
    reportRangeTitle: formatPdfReportRangeTitle(reportRange),
    kpiOverview,
    digestSummary,
    digestAttention,
    digestRecentChanges,
    teamAttention: {
      rows: teamAttentionRows,
      subtitle: `${teamOverview.attentionTotalCount} people flagged in the selected period`,
    },
    teamTrends,
    workloadBalance,
  };
}
