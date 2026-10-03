import { format } from "date-fns";
import type { PersonBriefModel } from "./personBriefTypes";
import type { PerformanceExportPayload } from "../../services/export/types";

export function buildPersonBriefPdfPayload(
  brief: PersonBriefModel,
): PerformanceExportPayload {
  const now = new Date();
  const sections: PerformanceExportPayload["sections"] = [
    {
      title: "Summary",
      keyValues: [
        { label: "Employee", value: brief.personName },
        { label: "Role", value: brief.role },
        { label: "Period", value: brief.periodLabel },
        { label: "Availability", value: brief.availability },
        { label: "Workload", value: brief.workload },
      ],
    },
    {
      title: "Performance",
      keyValues: brief.performanceKpis.map((kpi) => ({
        label: kpi.label,
        value: kpi.contextLabel
          ? `${kpi.value} (${kpi.contextLabel})`
          : String(kpi.value),
      })),
    },
    {
      title: "Current work",
      rowHeaders: ["Issue", "Title", "Status"],
      rows: brief.currentWork.topTasks.map((task) => ({
        cells: [task.key, task.title, task.status],
      })),
      emptyText: "No active tasks in scope.",
    },
    {
      title: "Recently completed",
      rowHeaders: ["Issue", "Title", "Completed"],
      rows: brief.completedWork.map((item) => ({
        cells: [item.issueKey, item.title, item.completedLabel],
      })),
      emptyText: "No completed work in this period.",
    },
  ];

  if (brief.prompts.length) {
    sections.push({
      title: "Discussion prompts",
      rows: brief.prompts.map((prompt) => ({
        cells: [prompt.fact, prompt.prompt],
      })),
      rowHeaders: ["Fact", "Prompt"],
    });
  }

  return {
    view: "personal-my-week",
    reportTitle: `1:1 brief · ${brief.personName}`,
    metadata: {
      reportRange: brief.periodLabel,
      generatedAt: format(now, "yyyy-MM-dd HH:mm"),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: format(now, "xxx"),
      personName: brief.personName,
      targetReviewDays: 0,
    },
    sections,
  };
}
