import { businessMsToDays } from '../jira/dates';
import type { TeamSnapshot } from '../people/types';
import type { AuditReportData } from '../jira/types';
import type { TeamRadarItem } from '../radar/types';
import { buildTeamRadar, summarizeTeamRadar } from '../radar/teamRadar';
import { buildDeliveryRiskItems } from '../radar/deliveryRisk';
import type { KpiSnapshotFile } from '../snapshots/types';
import { getCurrentWeekRange } from '../periods/dateRange';
import { computeTeamFlowMetrics } from '../periods/issuePeriodMetrics';
import { personTrendFieldPoints } from '../snapshots/snapshotEngine';
import {
  compareTrendWithAggregation,
  compareWeightedFirstPassTrend,
  TREND_METRICS,
  trendSufficiency,
} from '../trends/trendEngine';

import { appNow } from "../../platform/appClock";
export function buildTeamWeeklyDigest(
  snapshot: TeamSnapshot,
  reportData: AuditReportData,
  radarItems: TeamRadarItem[],
  kpiSnapshots: KpiSnapshotFile,
  teamLabel = 'Team',
  now = appNow(),
): string {
  const params = reportData.params;
  const radarSummary = summarizeTeamRadar(radarItems);
  const deliveryRisk = buildDeliveryRiskItems(snapshot, params);
  const vacationSoon = snapshot.persons.filter(
    (p) => p.availability.state === 'vacation_soon' || p.availability.state === 'vacation_tomorrow',
  ).length;
  const overloaded = snapshot.persons.filter(
    (p) => p.workload?.level === 'high' || p.workload?.level === 'overloaded',
  ).length;

  const weekFlow = computeTeamFlowMetrics(snapshot.persons, getCurrentWeekRange(now), params);
  const completedCountPoints = personTrendFieldPoints(kpiSnapshots, 'completedOnDate');
  const firstPassPoints = personTrendFieldPoints(kpiSnapshots, 'firstPassOnDate');
  const fpSufficiency = trendSufficiency(completedCountPoints, 28, now);

  const lines = [
    teamLabel,
    '',
    'This week',
    '',
    `Completed: ${weekFlow.completedCount}`,
    `First Pass: ${weekFlow.firstPassPercent}%`,
    `Cycle Time (median): ${weekFlow.medianCycleMs == null ? '—' : businessMsToDays(weekFlow.medianCycleMs).toFixed(1)} business days`,
    `Backflow Events: ${weekFlow.backflowEventCount}`,
    '',
    'Attention:',
    `- ${overloaded} people have Heavy/Overloaded current workload`,
    `- ${deliveryRisk.length} tasks are at risk`,
    `- ${vacationSoon} people start vacation soon`,
    radarSummary.peopleNeedingAttention
      ? `- ${radarSummary.peopleNeedingAttention} people need attention on Team Radar`
      : '- No team issues need attention right now',
    '',
    'Recent changes:',
  ];

  if (fpSufficiency.sufficient) {
    const fpTrend = compareWeightedFirstPassTrend(
      completedCountPoints,
      firstPassPoints,
      28,
      now,
    );
    lines.push(`- First Pass ${fpTrend.label} vs previous 4 weeks`);
  } else {
    lines.push(
      `- Trend comparison will appear after more history (${fpSufficiency.daysRecorded} days recorded, ${fpSufficiency.recommended} recommended)`,
    );
  }

  const problematicPoints = personTrendFieldPoints(kpiSnapshots, 'problematicCount');
  const problematicTrend = compareTrendWithAggregation(
    problematicPoints,
    TREND_METRICS.problematic,
    28,
    now,
  );
  if (problematicTrend.sufficient && problematicTrend.previous > 0) {
    const delta = problematicTrend.absoluteDelta;
    if (delta !== 0) {
      lines.push(
        `- Problematic tasks ${delta < 0 ? 'decreased' : 'increased'} from ${problematicTrend.previous.toFixed(1)} to ${problematicTrend.current.toFixed(1)} daily avg`,
      );
    } else {
      lines.push('- No significant change in problematic task daily average');
    }
  } else if (!problematicTrend.sufficient) {
    lines.push('- No significant historical change yet');
  }

  return lines.join('\n');
}

export function buildTeamRadarForDigest(snapshot: TeamSnapshot, params: AuditReportData['params']) {
  return buildTeamRadar(snapshot, params);
}

export interface DigestRow {
  label: string;
  value: string;
}

export interface DigestColumn {
  title: string;
  rows: DigestRow[];
}

export function buildTeamDigestSections(
  snapshot: TeamSnapshot,
  reportData: AuditReportData,
  radarItems: TeamRadarItem[],
  kpiSnapshots: KpiSnapshotFile,
  now = appNow(),
): DigestColumn[] {
  const params = reportData.params;
  const radarSummary = summarizeTeamRadar(radarItems);
  const deliveryRisk = buildDeliveryRiskItems(snapshot, params);
  const vacationSoon = snapshot.persons.filter(
    (p) => p.availability.state === 'vacation_soon' || p.availability.state === 'vacation_tomorrow',
  ).length;
  const overloaded = snapshot.persons.filter(
    (p) => p.workload?.level === 'high' || p.workload?.level === 'overloaded',
  ).length;

  const weekFlow = computeTeamFlowMetrics(snapshot.persons, getCurrentWeekRange(now), params);
  const completedCountPoints = personTrendFieldPoints(kpiSnapshots, 'completedOnDate');
  const firstPassPoints = personTrendFieldPoints(kpiSnapshots, 'firstPassOnDate');
  const fpSufficiency = trendSufficiency(completedCountPoints, 28, now);

  const periodRows: DigestRow[] = [
    { label: 'Completed', value: String(weekFlow.completedCount) },
    { label: 'First Pass', value: `${weekFlow.firstPassPercent}%` },
    { label: 'Cycle Time (median)', value: weekFlow.medianCycleMs == null ? '—' : `${businessMsToDays(weekFlow.medianCycleMs).toFixed(1)} business days` },
    { label: 'Backflow Events', value: String(weekFlow.backflowEventCount) },
  ];

  const attentionRows: DigestRow[] = [
    { label: 'Heavy/Overloaded current workload', value: String(overloaded) },
    { label: 'Tasks at risk', value: String(deliveryRisk.length) },
    { label: 'Vacation soon', value: String(vacationSoon) },
    {
      label: 'People need attention',
      value: radarSummary.peopleNeedingAttention
        ? String(radarSummary.peopleNeedingAttention)
        : '0',
    },
  ];

  const recentRows: DigestRow[] = [];
  if (fpSufficiency.sufficient) {
    const fpTrend = compareWeightedFirstPassTrend(
      completedCountPoints,
      firstPassPoints,
      28,
      now,
    );
    recentRows.push({ label: 'First Pass trend', value: fpTrend.label });
  } else {
    recentRows.push({
      label: 'First Pass trend',
      value: `${fpSufficiency.daysRecorded}/${fpSufficiency.recommended} days`,
    });
  }

  const problematicPoints = personTrendFieldPoints(kpiSnapshots, 'problematicCount');
  const problematicTrend = compareTrendWithAggregation(
    problematicPoints,
    TREND_METRICS.problematic,
    28,
    now,
  );
  if (problematicTrend.sufficient && problematicTrend.previous > 0) {
    const delta = problematicTrend.absoluteDelta;
    recentRows.push({
      label: 'Problematic tasks',
      value:
        delta === 0
          ? 'No change'
          : `${delta < 0 ? '↓' : '↑'} ${problematicTrend.current.toFixed(1)} avg`,
    });
  } else {
    recentRows.push({ label: 'Problematic tasks', value: '—' });
  }

  return [
    { title: 'This week', rows: periodRows },
    { title: 'Attention', rows: attentionRows },
    { title: 'Recent changes', rows: recentRows },
  ];
}
