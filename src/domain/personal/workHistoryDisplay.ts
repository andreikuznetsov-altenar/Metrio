import { format } from 'date-fns';
import type { WorkHistoryPeriod } from './workHistory';
import { formatCycleDurationShort } from '../../pages/performance/analyticsDrawerPresentation';
import type { WorkHistoryRow } from '../performance';

export function formatWorkHistoryGroupLabel(
  periodKey: string,
  period: WorkHistoryPeriod,
): string {
  if (period === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
    if (match) {
      return format(
        new Date(Number(match[1]), Number(match[2]) - 1, 1),
        'MMMM yyyy',
      );
    }
  }
  if (period === 'quarter') {
    const match = /^(\d{4})-Q(\d)$/.exec(periodKey);
    if (match) {
      return `Q${match[2]} ${match[1]}`;
    }
  }
  if (period === 'week') {
    const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
    if (match) {
      return `Week ${Number(match[2])}, ${match[1]}`;
    }
  }
  return periodKey;
}

export function formatWorkHistoryGroupSummary(group: {
  completedCount: number;
  firstPassCount: number;
  reviewReturns: number;
}): string {
  return `${group.completedCount} completed · ${group.firstPassCount} first pass · ${group.reviewReturns} rework`;
}

function isPlaceholderToken(value: string | undefined | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '—' || trimmed === '–' || trimmed === '-';
}

/** Structured history row metadata without orphan separators. */
export function formatWorkHistoryRowMeta(row: WorkHistoryRow): string {
  const parts: string[] = [];

  if (!isPlaceholderToken(row.completedOn)) {
    parts.push(row.completedOn.trim());
  } else if (row.completedAtIso) {
    const isoDate = row.completedAtIso.slice(0, 10);
    if (isoDate) {
      parts.push(format(new Date(isoDate), 'd MMM yyyy'));
    }
  }

  const cycleFromMs = formatCycleDurationShort(row.cycleMs);
  if (cycleFromMs) {
    parts.push(`Cycle ${cycleFromMs}`);
  } else if (!isPlaceholderToken(row.cycle)) {
    const cycle = row.cycle.trim();
    if (/^cycle\b/i.test(cycle)) {
      parts.push(cycle);
    } else {
      parts.push(`Cycle ${cycle}`);
    }
  }

  return parts.join(' · ');
}
