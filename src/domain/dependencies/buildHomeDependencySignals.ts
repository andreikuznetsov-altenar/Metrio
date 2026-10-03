import type { DeliveryDependencyIndex, HomeDependencySignal } from "./dependencyTypes";

export function buildHomeDependencySignals(
  index: DeliveryDependencyIndex | null | undefined,
): HomeDependencySignal[] {
  if (!index) return [];
  const signals: HomeDependencySignal[] = [];

  for (const fan of index.fanOut.slice(0, 2)) {
    signals.push({
      id: `fan-out-${fan.blockerIssueKey}`,
      title: `${fan.blockerIssueKey} blocks ${fan.blockedActiveCount} active tasks`,
      description: `${fan.blockerProject} dependency affecting delivery`,
      severity: fan.blockedActiveCount >= 3 ? "warning" : "info",
      blockerKey: fan.blockerIssueKey,
      filterIssueKeys: fan.blockedIssueKeys,
    });
  }

  if (!signals.length && index.summary.blockedActiveCount > 0) {
    signals.push({
      id: "blocked-summary",
      title: `${index.summary.blockedActiveCount} tasks blocked by dependencies`,
      description: `${index.summary.crossProjectCount} cross-project`,
      severity: "info",
    });
  }

  return signals;
}
