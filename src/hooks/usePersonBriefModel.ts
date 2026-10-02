import { useMemo } from "react";
import type { DateRangeKey } from "../domain/performance";
import { buildPersonBrief } from "../domain/personBrief/buildPersonBrief";
import type { PersonBriefModel } from "../domain/personBrief/personBriefTypes";
import { matchOnboardingResources } from "../domain/onboarding/matchOnboardingResources";
import { buildPerformanceViewModels } from "../services/performance/performanceViewModel";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import {
  performanceDateRangeFromPresetKey,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import type { SurveyDataFile } from "../domain/survey/types";
import type { WorkKnowledgeLink } from "../domain/workGraph/workGraphTypes";

export function usePersonBriefModel(input: {
  personId: string;
  periodPreset: DateRangeKey;
  data: PerformanceFetchResult | null;
  selfPersonId: string;
  surveyData?: SurveyDataFile | null;
  knowledgeLinks: WorkKnowledgeLink[];
  jiraBaseUrl: string;
}): PersonBriefModel | null {
  return useMemo(() => {
    if (!input.data) return null;
    const displayRange: PerformanceDateRange = performanceDateRangeFromPresetKey(
      input.periodPreset,
    );
    const vm = buildPerformanceViewModels(
      input.data,
      input.selfPersonId,
      input.periodPreset,
      displayRange,
      "team",
    );
    const person = vm.getPerson(input.personId);
    const workspace = vm.getPersonAnalytics(input.personId);
    if (!person || !workspace) return null;

    const matched = matchOnboardingResources(
      {
        department: person.bamboo.department,
        jobTitle: person.bamboo.jobTitle,
        projects: [],
        confluenceLinks: input.knowledgeLinks.map((link) => ({
          id: link.id,
          title: link.page.title,
          url: link.page.url,
          confidence: link.confidence,
          projectKey: link.projectKey,
        })),
      },
      input.jiraBaseUrl,
    );

    return buildPersonBrief({
      person,
      workspace,
      periodPreset: input.periodPreset,
      surveyData: input.surveyData,
      matchedResources: matched.preview.slice(0, 4),
    });
  }, [
    input.data,
    input.personId,
    input.periodPreset,
    input.selfPersonId,
    input.surveyData,
    input.knowledgeLinks,
    input.jiraBaseUrl,
  ]);
}
