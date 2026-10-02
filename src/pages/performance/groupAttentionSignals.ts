import type { BadgeVariant } from "../../components/Badge/Badge";
import type { PersonalAttentionItem } from "../../domain/performance";

export interface GroupedAttentionSignal {
  label: string;
  variant: BadgeVariant;
  reason: string;
  issueKeys: string[];
  taskCount: number;
}

function groupKey(item: PersonalAttentionItem): string {
  return `${item.variant}|${item.label.toLowerCase()}|${item.reason.trim().toLowerCase()}`;
}

export function groupAttentionSignals(
  items: PersonalAttentionItem[],
): GroupedAttentionSignal[] {
  const groups = new Map<string, GroupedAttentionSignal>();

  for (const item of items) {
    const key = groupKey(item);
    const existing = groups.get(key);
    if (existing) {
      existing.taskCount += 1;
      if (item.issueKey && !existing.issueKeys.includes(item.issueKey)) {
        existing.issueKeys.push(item.issueKey);
      }
      continue;
    }
    groups.set(key, {
      label: item.label,
      variant: item.variant,
      reason: item.reason,
      issueKeys: item.issueKey ? [item.issueKey] : [],
      taskCount: 1,
    });
  }

  return [...groups.values()];
}

/** Hidden "+N more" count for drawer attention keys row (relative to visible keys). */
export function hiddenAttentionKeyCount(
  taskCount: number,
  visibleKeys: string[],
): number {
  return Math.max(0, taskCount - visibleKeys.length);
}
