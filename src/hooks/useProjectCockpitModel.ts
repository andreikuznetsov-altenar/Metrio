import { useMemo } from "react";
import type { PerformanceDateRange } from "../domain/performance/performanceDateRange";
import { buildProjectCockpit } from "../domain/projectCockpit/buildProjectCockpit";
import type { ProjectCockpitModel } from "../domain/projectCockpit/projectCockpitTypes";
import type { CurrentUser } from "../domain/types";
import type { OperationalRules } from "../domain/operationalRules/operationalRulesTypes";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import type { WorkKnowledgeLink, WorkProject } from "../domain/workGraph/workGraphTypes";
import {
  getCachedProjectCockpit,
  projectCockpitCacheKey,
  setCachedProjectCockpit,
} from "../platform/projectCockpitCache";

export function useProjectCockpitModel(input: {
  projectKey: string | null;
  data: PerformanceFetchResult | null;
  dateRange: PerformanceDateRange;
  currentUser: CurrentUser;
  projects: WorkProject[];
  knowledgeLinks: WorkKnowledgeLink[];
  knowledgeUnavailable: boolean;
  jiraBaseUrl: string;
  operationalRules: OperationalRules;
}): ProjectCockpitModel | null {
  return useMemo(() => {
    if (!input.projectKey || !input.data?.teamSnapshot) return null;
    const rangeKey = `${input.dateRange.from}:${input.dateRange.to}:${input.dateRange.preset}`;
    const cacheKey = projectCockpitCacheKey(rangeKey, input.projectKey);
    const cached = getCachedProjectCockpit(cacheKey);
    if (cached) return cached;

    const model = buildProjectCockpit({
      scope: { kind: "project", projectKey: input.projectKey },
      snapshot: input.data.teamSnapshot,
      params: input.data.reportParams,
      displayRange: input.dateRange,
      projects: input.projects,
      knowledgeLinks: input.knowledgeLinks,
      knowledgeUnavailable: input.knowledgeUnavailable,
      currentUser: input.currentUser,
      jiraBaseUrl: input.jiraBaseUrl,
      operationalRules: input.operationalRules,
    });
    setCachedProjectCockpit(cacheKey, model);
    return model;
  }, [
    input.projectKey,
    input.data,
    input.dateRange,
    input.currentUser,
    input.projects,
    input.knowledgeLinks,
    input.knowledgeUnavailable,
    input.jiraBaseUrl,
    input.operationalRules,
  ]);
}
