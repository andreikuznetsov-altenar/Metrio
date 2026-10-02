import {
  CURATED_ONBOARDING_RESOURCES,
  materializeCuratedResource,
} from "../../config/onboardingResources";
import {
  NEW_STARTER_PREVIEW_LIMIT,
  type MatchedOnboardingResources,
  type OnboardingResource,
  type OnboardingResourceGroup,
  type OnboardingResourceMatchInput,
} from "./resourceTypes";

const HIGH_CONFIDENCE = new Set([
  "explicit_link",
  "exact_issue_key",
  "explicit_project_space",
  "exact_project_key",
]);

const GROUP_ORDER: OnboardingResourceGroup[] = [
  "company",
  "department",
  "team_projects",
  "tools",
  "policies",
];

function normalize(value?: string): string {
  return (value || "").trim().toLowerCase();
}

function jobTitleBoost(def: { jobTitleHints?: string[] }, jobTitle?: string): number {
  if (!def.jobTitleHints?.length || !jobTitle) return 0;
  const title = normalize(jobTitle);
  return def.jobTitleHints.some((hint) => title.includes(normalize(hint))) ? 8 : 0;
}

function dedupeResources(items: OnboardingResource[]): OnboardingResource[] {
  const byId = new Map<string, OnboardingResource>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing || item.priority > existing.priority) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

function sortResources(items: OnboardingResource[]): OnboardingResource[] {
  return [...items].sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
}

function groupResources(
  items: OnboardingResource[],
): Partial<Record<OnboardingResourceGroup, OnboardingResource[]>> {
  const byGroup: Partial<Record<OnboardingResourceGroup, OnboardingResource[]>> = {};
  for (const group of GROUP_ORDER) {
    const rows = items.filter((item) => item.group === group);
    if (rows.length) byGroup[group] = rows;
  }
  return byGroup;
}

export function matchOnboardingResources(
  input: OnboardingResourceMatchInput,
  jiraBaseUrl: string,
): MatchedOnboardingResources {
  const dept = normalize(input.department);
  const location = normalize(input.location);
  const team = normalize(input.teamLabel);
  const matched: OnboardingResource[] = [];

  for (const def of CURATED_ONBOARDING_RESOURCES) {
    let include = false;
    let priority = def.priority + jobTitleBoost(def, input.jobTitle);

    if (def.audience === "company") {
      include = true;
    } else if (def.audience === "department" && def.audienceKey) {
      include = dept === def.audienceKey || dept.includes(def.audienceKey);
      priority += jobTitleBoost(def, input.jobTitle);
    } else if (def.audience === "location" && def.audienceKey && location) {
      include = location.includes(def.audienceKey);
    } else if (def.audience === "team" && def.audienceKey && team) {
      include = team.includes(def.audienceKey);
    } else if (def.audience === "role_context") {
      include = jobTitleBoost(def, input.jobTitle) > 0;
      priority += 5;
    }

    if (include) {
      matched.push({
        ...materializeCuratedResource(def, jiraBaseUrl),
        priority,
      });
    }
  }

  for (const project of input.projects.slice(0, 5)) {
    matched.push({
      id: `jira-project-${project.key}`,
      title: `${project.name} (${project.key})`,
      description: "Your Jira project",
      source: "jira",
      audience: "project",
      group: "team_projects",
      priority: 60,
      tags: ["jira", project.key],
      target: {
        kind: "jira_project",
        projectKey: project.key,
        url: project.jiraUrl,
      },
    });
  }

  for (const link of input.confluenceLinks) {
    if (!HIGH_CONFIDENCE.has(link.confidence)) continue;
    if (!link.url) continue;
    matched.push({
      id: `confluence-${link.id}`,
      title: link.title,
      source: "confluence",
      audience: "project",
      group: "team_projects",
      priority: link.confidence === "explicit_link" ? 72 : 68,
      tags: link.projectKey ? [link.projectKey] : undefined,
      target: {
        kind: "confluence_page",
        pageId: link.id,
        url: link.url,
      },
    });
  }

  const all = sortResources(dedupeResources(matched));
  const companyDefaults = sortResources(
    dedupeResources(
      CURATED_ONBOARDING_RESOURCES.filter((d) => d.audience === "company").map((d) =>
        materializeCuratedResource(d, jiraBaseUrl),
      ),
    ),
  );

  const effective = all.length ? all : companyDefaults;

  return {
    all: effective,
    preview: effective.slice(0, NEW_STARTER_PREVIEW_LIMIT),
    byGroup: groupResources(effective),
  };
}

export function filterOnboardingResources(
  resources: OnboardingResource[],
  query: string,
): OnboardingResource[] {
  const q = normalize(query);
  if (!q) return resources;
  return resources.filter(
    (item) =>
      normalize(item.title).includes(q) ||
      normalize(item.description).includes(q) ||
      item.tags?.some((tag) => normalize(tag).includes(q)) ||
      normalize(item.group).includes(q) ||
      normalize(item.source).includes(q),
  );
}
