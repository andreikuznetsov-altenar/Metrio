import type { PersonAnalyticsWorkspace } from "../analytics/personAnalyticsWorkspace";
import type { Person } from "../people/types";
import type { DateRangeKey } from "../performance";
import {
  comparisonPeriodLabel,
  performanceDateRangeFromPresetKey,
} from "../performance/performanceDateRange";
import {
  formatNewStarterHeadline,
  isNewStarter,
} from "../onboarding/newStarter";
import {
  groupAttentionSignals,
  isActionableAttentionLabel,
} from "../../pages/performance/groupAttentionSignals";
import { summarizeFeedbackActions } from "../feedback/feedbackActionSummary";
import type { SurveyDataFile } from "../survey/types";
import type {
  OnboardingResource,
  OnboardingResourceTarget,
} from "../onboarding/resourceTypes";
import { bambooEmployeePortalUrl } from "../../config/bambooPortal";
import { formatWorkHistoryRowMeta } from "../personal/workHistoryDisplay";
import { buildPersonBriefPrompts } from "./buildPersonBriefPrompts";
import type { PersonBriefModel } from "./personBriefTypes";

export interface BuildPersonBriefInput {
  person: Person;
  workspace: PersonAnalyticsWorkspace;
  periodPreset: DateRangeKey;
  surveyData?: SurveyDataFile | null;
  matchedResources?: OnboardingResource[];
}

function extractCompletedWork(
  workspace: PersonAnalyticsWorkspace,
): PersonBriefModel["completedWork"] {
  const rows = workspace.historyMonth
    .flatMap((group) => group.rows)
    .slice(0, 20);
  return rows.slice(0, 5).map((row) => ({
    issueKey: row.key,
    title: row.title,
    completedLabel: row.completedOn,
    metaLine: formatWorkHistoryRowMeta(row),
    firstPass: Boolean(row.firstPass ?? /first pass/i.test(row.outcome)),
  }));
}

function backflowIssueKeys(workspace: PersonAnalyticsWorkspace): string[] {
  const keys: string[] = [];
  for (const group of workspace.historyMonth) {
    for (const row of group.rows) {
      if (/rework|backflow/i.test(row.outcome)) {
        keys.push(row.key);
      }
    }
  }
  return [...new Set(keys)].slice(0, 5);
}

function countInReview(workspace: PersonAnalyticsWorkspace): number {
  return workspace.workRows.filter((row) => /review/i.test(row.status)).length;
}

function resourceOpenUrl(target: OnboardingResourceTarget): string {
  if (target.kind === "external") return target.url;
  if (target.kind === "confluence_page" || target.kind === "confluence_space") {
    return target.url;
  }
  if (target.kind === "jira_project") return target.url;
  if (target.kind === "bamboo_portal") return bambooEmployeePortalUrl();
  return "";
}

function mapResources(resources: OnboardingResource[]): PersonBriefModel["resources"] {
  return resources.slice(0, 4).map((resource) => ({
    title: resource.title,
    url: resourceOpenUrl(resource.target),
    source: resource.source,
    subtitle: resource.description,
  }));
}

function buildBriefFeedbackLines(
  surveyData: SurveyDataFile | null | undefined,
): string[] {
  const summary = summarizeFeedbackActions(surveyData);
  const lines: string[] = [];
  const latest = surveyData?.surveys?.[surveyData.surveys.length - 1];
  if (latest && (latest.status === "active" || latest.status === "sending")) {
    const responded = latest.recipients.filter((r) => r.respondedAt).length;
    const total = latest.recipients.length;
    if (total > 0) {
      lines.push(`Survey in progress · ${responded}/${total} responses`);
    }
  } else if (summary.preparedNotSent) {
    lines.push("Survey prepared");
  }
  if (summary.deliveryFailureCount > 0) {
    lines.push(
      `${summary.deliveryFailureCount} delivery failure${summary.deliveryFailureCount === 1 ? "" : "s"}`,
    );
  } else if (summary.pendingResponseCount > 0) {
    lines.push(`${summary.pendingResponseCount} pending responses`);
  }
  return lines;
}

export function buildPersonBrief(input: BuildPersonBriefInput): PersonBriefModel {
  const { person, workspace, periodPreset } = input;
  const displayRange = performanceDateRangeFromPresetKey(periodPreset);
  const periodLabel = comparisonPeriodLabel(displayRange);
  const hireDate = person.bamboo.hireDate;
  const newStarter =
    hireDate && isNewStarter(hireDate)
      ? {
          headline: formatNewStarterHeadline(hireDate),
          limitedHistoryNote:
            "Limited performance history is expected for new starters.",
        }
      : undefined;

  const backflowKpi = workspace.performanceKpis.find(
    (kpi) => kpi.label === "Backflows",
  );
  const backflowCount = Number.parseInt(backflowKpi?.value ?? "0", 10) || 0;

  const feedbackLines = buildBriefFeedbackLines(input.surveyData);

  const attention = groupAttentionSignals(
    workspace.attention.filter((item) => isActionableAttentionLabel(item.label)),
  );
  const briefCore: PersonBriefModel = {
    personId: workspace.personId,
    personName: workspace.personName,
    role: workspace.role,
    periodPreset,
    periodLabel,
    availability: workspace.availability,
    workload: workspace.workload,
    timeOff: workspace.timeOff
      ? {
          headline: workspace.timeOff.headline ?? workspace.timeOff.note,
          rangeLabel: workspace.timeOff.rangeLabel,
          activeWorkCount: workspace.activeWorkCount,
        }
      : undefined,
    newStarter,
    performanceKpis: workspace.performanceKpis.filter((kpi) =>
      ["Completed", "First pass", "Backflows"].includes(kpi.label),
    ),
    cycleTime: workspace.cycleTime,
    currentWork: {
      activeCount: workspace.activeWorkCount,
      inReviewCount: countInReview(workspace),
      problematicCount: workspace.problematicWork.length,
      topTasks: workspace.workRows.slice(0, 5),
    },
    completedWork: extractCompletedWork(workspace),
    attention,
    backflows: {
      count: backflowCount,
      issueKeys: backflowIssueKeys(workspace),
    },
    feedbackLines,
    resources: mapResources(input.matchedResources ?? []),
    prompts: [],
    generatedNote:
      "Factual summary from Jira, Bamboo availability, and Metrio performance data. Not an evaluation.",
  };
  briefCore.prompts = buildPersonBriefPrompts(briefCore);
  return briefCore;
}
