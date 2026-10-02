import { useMemo } from "react";
import { resolveJiraBaseUrl } from "../config/product";
import { useOptionalCompanyConfig } from "../app/CompanyConfigContext";
import { toCuratedResourceDefs } from "../domain/companyConfig/buildEffectiveConfig";
import { CURATED_ONBOARDING_RESOURCES } from "../config/onboardingResources";
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
  const companyConfig = useOptionalCompanyConfig();

  useEffect(() => {
    void loadPreferences().then((prefs) => setJiraBase(resolveJiraBaseUrl(prefs)));
  }, []);

  return useMemo(() => {
    if (companyConfig && !companyConfig.effective.features.onboarding) {
      return { preview: [], all: [], byGroup: {} };
    }
    const catalog = companyConfig
      ? toCuratedResourceDefs(companyConfig.effective.resources)
      : undefined;
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
    return matchOnboardingResources(
      matchInput,
      jiraBase || "https://jira.atlassian.net",
      catalog ?? CURATED_ONBOARDING_RESOURCES,
    );
  }, [
    companyConfig,
    input.department,
    input.jobTitle,
    input.location,
    input.teamLabel,
    input.projects,
    input.knowledgeLinks,
    jiraBase,
  ]);
}
