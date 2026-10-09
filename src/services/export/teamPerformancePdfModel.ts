import { endOfDay, format, parseISO } from 'date-fns';
import { parseDateStartOfDay } from '../../domain/jira/dates';
import type { DateRange } from '../../domain/periods/dateRange';
import { buildDeliveryRiskItems } from '../../domain/radar/deliveryRisk';
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
import {
  buildCanonicalPersonPeriodKpis,
  deliveryRiskCountByPersonId,
  filterIndividualContributorPersons,
  resolveTeamDisplayNameFromPersons,
  workloadBalanceSubtitle,
} from './teamPdfHelpers';

function reportRangeToDateRange(range: ReportRangeIso): DateRange {
  const start = parseDateStartOfDay(range.from) ?? parseISO(range.from);
  const end = endOfDay(parseDateStartOfDay(range.to) ?? parseISO(range.to));
  return { start, end };
}

export function formatPdfReportRangeTitle(range: ReportRangeIso): string {
  const fmt = (iso: string) => format(parseISO(iso), 'd MMM yyyy');
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}

function pickTeamKpis(summary: TeamPerformanceSnapshot['summary']) {
  const byLabel = new Map(summary.map((metric) => [metric.label, metric]));
  const hero = byLabel.get('Efficiency');
  const supportingLabels = ['First pass', 'Completed', 'Backflows'] as const;
  return {
    hero: {
      label: 'Efficiency',
      value: hero?.value ?? '—',
      description: hero?.status ?? undefined,
      comparison: hero?.contextLabel,
    },
    supporting: supportingLabels.map((label) => {
      const metric = byLabel.get(label);
      return {
        label,
        value: metric?.value ?? '—',
        comparison: metric?.contextLabel,
      };
    }),
  };
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
  const deliveryRisk = buildDeliveryRiskItems(teamSnapshot, params);
  const atRiskByPerson = deliveryRiskCountByPersonId(deliveryRisk);

  const avgCycleDays =
    periodFlow.avgCycleMs !== null
      ? (periodFlow.avgCycleMs / (24 * 60 * 60 * 1000)).toFixed(1)
      : '—';

  const digestSummary =
    `For ${formatPdfReportRangeTitle(reportRange)}, the team completed ${periodFlow.completedCount} items ` +
    `with ${periodFlow.firstPassPercent}% first pass, ${avgCycleDays} days average cycle, and ${periodFlow.backflowCount} backflows.`;

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

  const teamEfficiency = pickTeamKpis(teamOverview.summary);

  const roster = teamSnapshot.persons.map((person) => ({
    personId: person.id,
    name: person.bamboo.displayName,
    jobTitle: person.bamboo.jobTitle || '—',
    avatarDataUrl: input.avatarDataUrls?.[person.id] ?? null,
  }));

  const contributors = filterIndividualContributorPersons(teamSnapshot.persons);
  const individualEfficiency = contributors.map((person) => {
    const kpis = buildCanonicalPersonPeriodKpis(person);
    return {
      personId: person.id,
      name: person.bamboo.displayName,
      jobTitle: person.bamboo.jobTitle || '—',
      avatarDataUrl: input.avatarDataUrls?.[person.id] ?? null,
      ...kpis,
    };
  });

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

  const workloadRows = teamOverview.workload.map((row) => ({
    personId: row.personId,
    personName: row.personName ?? '—',
    active: String(row.activeWork),
    atRisk: String(atRiskByPerson.get(row.personId) ?? row.atRisk ?? 0),
    workload: row.workload,
  }));

  const numericActive = workloadRows.map((row) => ({
    personName: row.personName,
    active: Number.parseInt(row.active, 10) || 0,
  }));

  const vectorLogoPreferred =
    !input.companyLogoSrc ||
    input.companyLogoSource.includes('incompatible') ||
    input.companyLogoSource === 'unavailable';

  return {
    companyLogoSrc: input.companyLogoSrc,
    companyLogoSource: input.companyLogoSource,
    useVectorLogo: vectorLogoPreferred,
    teamName: resolveTeamDisplayNameFromPersons(teamSnapshot.persons),
    reportRange,
    reportRangeTitle: formatPdfReportRangeTitle(reportRange),
    roster,
    teamEfficiency,
    individualEfficiency,
    digestSummary,
    digestRecentChanges,
    teamTrends,
    workloadBalance: {
      subtitle: workloadBalanceSubtitle(numericActive),
      rows: workloadRows,
    },
  };
}
