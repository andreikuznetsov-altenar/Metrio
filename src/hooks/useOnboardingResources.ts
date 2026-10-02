import { useMemo } from "react";
import { resolveJiraBaseUrl } from "../config/product";
import { matchOnboardingResources } from "../domain/onboarding/matchOnboardingResources";
import type { OnboardingResourceMatchInput } from "../domain/onboarding/resourceTypes";
import type { WorkKnowledgeLink, WorkProject } from "../domain/workGraph/workGraphTypes";
import { loadPreferences } from "../platform/preferences";
import { useEffect, useState } from "react";

export function useOnboardingResources(input: {
  department?: string;
  jobTitle?: string;
  location?: string;
  teamLabel?: string;
  projects: WorkProject[];
  knowledgeLinks: WorkKnowledgeLink[];
}) {
  const [jiraBase, setJiraBase] = useState("");

  useEffect(() => {
    void loadPreferences().then((prefs) => setJiraBase(resolveJiraBaseUrl(prefs)));
  }, []);

  return useMemo(() => {
    const matchInput: OnboardingResourceMatchInput = {
      department: input.department,
      jobTitle: input.jobTitle,
      location: input.location,
      teamLabel: input.teamLabel,
      projects: input.projects.map((p) => ({
        key: p.key,
        name: p.name,
        jiraUrl: p.jiraUrl,
      })),
      confluenceLinks: input.knowledgeLinks.map((link) => ({
        id: link.page.id,
        title: link.page.title,
        url: link.page.url,
        confidence: link.confidence,
        projectKey: link.projectKey,
      })),
    };
    return matchOnboardingResources(matchInput, jiraBase || "https://jira.atlassian.net");
  }, [
    input.department,
    input.jobTitle,
    input.location,
    input.teamLabel,
    input.projects,
    input.knowledgeLinks,
    jiraBase,
  ]);
}
