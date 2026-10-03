import type { PersonBriefModel } from "./personBriefTypes";

export function formatPersonBriefPlainText(brief: PersonBriefModel): string {
  const lines: string[] = [
    `1:1 brief · ${brief.personName}`,
    brief.role,
    `Period: ${brief.periodLabel}`,
    `Availability: ${brief.availability}`,
  ];
  if (brief.newStarter) {
    lines.push(brief.newStarter.headline);
    lines.push(brief.newStarter.limitedHistoryNote);
  }
  if (brief.timeOff) {
    lines.push(`${brief.timeOff.headline} · ${brief.timeOff.rangeLabel}`);
  }
  lines.push("", "Performance");
  for (const kpi of brief.performanceKpis) {
    const ctx = kpi.contextLabel
      ? ` (${kpi.contextLabel} ${kpi.contextCaption ?? ""})`.trim()
      : "";
    lines.push(`- ${kpi.label}: ${kpi.value}${ctx}`);
  }
  for (const segment of brief.cycleTime) {
    lines.push(`- ${segment.label}: ${segment.value}`);
  }
  lines.push(
    "",
    `Current work: ${brief.currentWork.activeCount} active · ${brief.currentWork.inReviewCount} in review · ${brief.currentWork.problematicCount} at risk`,
  );
  for (const task of brief.currentWork.topTasks) {
    lines.push(`- ${task.key} · ${task.title} · ${task.status}`);
  }
  if (brief.completedWork.length) {
    lines.push("", "Recently completed");
    for (const item of brief.completedWork) {
      lines.push(`- ${item.issueKey} · ${item.title} · ${item.completedLabel}`);
    }
  }
  if (brief.attention.length) {
    lines.push("", "Needs attention");
    for (const group of brief.attention) {
      lines.push(`- ${group.taskCount} · ${group.reason}`);
    }
  }
  if (brief.backflows.count > 0) {
    lines.push("", `Backflows: ${brief.backflows.count}`);
  }
  if (brief.feedbackLines.length) {
    lines.push("", "Feedback", ...brief.feedbackLines.map((line) => `- ${line}`));
  }
  if (brief.prompts.length) {
    lines.push("", "Discussion prompts");
    for (const prompt of brief.prompts) {
      lines.push(`- ${prompt.fact}`);
      lines.push(`  ${prompt.prompt}`);
    }
  }
  lines.push("", brief.generatedNote);
  return lines.join("\n");
}
