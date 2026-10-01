import { invoke } from '@tauri-apps/api/core';
import { PRODUCT_NAME } from '../config/product';
import { buildMyWeek } from '../domain/personal/myWeek';
import { buildTeamRadar, summarizeTeamRadar } from '../domain/radar/teamRadar';
import { buildDeliveryRiskItems } from '../domain/radar/deliveryRisk';
import type { TeamSnapshot } from '../domain/people/types';
import type { ReportParams } from '../domain/jira/types';

export async function updateTrayFromSnapshot(
  snapshot: TeamSnapshot,
  params?: ReportParams,
  title = PRODUCT_NAME,
): Promise<void> {
  const lines: string[] = [];

  if (snapshot.mode === 'team' && params) {
    const radar = buildTeamRadar(snapshot, params);
    const summary = summarizeTeamRadar(radar);
    const deliveryRisk = buildDeliveryRiskItems(snapshot, params).length;
    const vacationSoon = snapshot.persons.filter(
      (p) => p.availability.state === 'vacation_soon' || p.availability.state === 'vacation_tomorrow',
    ).length;

    if (summary.peopleNeedingAttention > 0) {
      lines.push(`${summary.peopleNeedingAttention} people need attention`);
    }
    if (deliveryRisk > 0) {
      lines.push(`${deliveryRisk} tasks at risk`);
    }
    if (vacationSoon > 0) {
      lines.push(`${vacationSoon} vacation soon`);
    }
    if (!lines.length) {
      lines.push('No team issues need attention');
    }
  } else if (snapshot.mode === 'personal' || snapshot.mode === 'personal_limited') {
    const me = snapshot.persons[0];
    if (me && params) {
      const week = buildMyWeek(me, params);
      lines.push(`${week.summary.currentlyActive} active`);
      if (week.summary.atRisk > 0) lines.push(`${week.summary.atRisk} at risk`);
      if (week.summary.inReview > 0) lines.push(`${week.summary.inReview} in review`);
      if (!week.summary.atRisk && !week.summary.inReview) {
        lines.push('Nothing needs attention');
      }
    } else if (me?.workload) {
      lines.push(`${me.workload.activeCount} active`);
    }
  }

  const openLabel =
    snapshot.mode === 'team' ? 'Open Team Radar' : snapshot.mode === 'personal' || snapshot.mode === 'personal_limited'
      ? 'Open My Week'
      : 'Open dashboard';

  await invoke('update_tray_snapshot', {
    snapshot: { title, lines: lines.slice(0, 3), open_label: openLabel },
  });
  await invoke('refresh_tray_menu');
}
