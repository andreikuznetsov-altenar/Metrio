import { matchOnboardingResources } from "../domain/onboarding/matchOnboardingResources";

/** @deprecated Use onboarding resource directory — kept for legacy imports. */
export interface OnboardingLink {
  id: string;
  label: string;
  kind: "confluence" | "jira" | "bamboo" | "external";
  url: string;
  department?: string;
}

/** @deprecated */
export function onboardingLinksForDepartment(
  department: string | undefined,
  max = 7,
): OnboardingLink[] {
  const matched = matchOnboardingResources(
    { department, projects: [], confluenceLinks: [] },
    "https://jira.atlassian.net",
  );
  return matched.preview.slice(0, max).map((resource) => ({
    id: resource.id,
    label: resource.title,
    kind: resource.source === "bamboo" ? "bamboo" : "external",
    url:
      resource.target.kind === "external" ||
      resource.target.kind === "jira_project" ||
      resource.target.kind === "confluence_page" ||
      resource.target.kind === "confluence_space"
        ? resource.target.url
        : "https://www.bamboohr.com/",
  }));
}
