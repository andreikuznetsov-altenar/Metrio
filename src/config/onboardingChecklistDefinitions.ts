import type {
  OnboardingCompletionMode,
  OnboardingItemCategory,
  OnboardingPhase,
} from "../domain/onboardingChecklist/onboardingChecklistTypes";

export const ONBOARDING_CHECKLIST_CONFIG_VERSION = 1;

export interface ChecklistItemDefinition {
  id: string;
  title: string;
  description?: string;
  category: OnboardingItemCategory;
  source: "curated" | "bamboo" | "jira" | "confluence" | "feedback" | "manual";
  completionMode: OnboardingCompletionMode;
  phase: OnboardingPhase;
  dueDay?: number;
  /** Links to `CURATED_ONBOARDING_RESOURCES` for open target */
  resourceId?: string;
  feedbackTemplateId?: string;
  feedbackDueDay?: number;
  jiraSignal?: "access" | "first_assignment";
  isMilestone?: boolean;
  /** Audience — same keys as onboarding resources */
  audience: "company" | "department" | "team" | "location";
  audienceKey?: string;
  addedInVersion: number;
}

export const ONBOARDING_CHECKLIST_DEFINITIONS: ChecklistItemDefinition[] = [
  {
    id: "company-welcome",
    title: "Review company handbook",
    description: "Policies and how we work",
    category: "company",
    source: "curated",
    completionMode: "confluence_explicit",
    phase: "first_week",
    dueDay: 7,
    resourceId: "company-handbook",
    audience: "company",
    addedInVersion: 1,
  },
  {
    id: "team-meet",
    title: "Meet your team",
    description: "Intro meetings with your manager and peers",
    category: "team",
    source: "manual",
    completionMode: "manual",
    phase: "first_week",
    dueDay: 7,
    audience: "company",
    addedInVersion: 1,
  },
  {
    id: "bamboo-hr-onboarding",
    title: "Complete BambooHR onboarding",
    description: "HR tasks in the employee portal",
    category: "bamboo",
    source: "bamboo",
    completionMode: "bamboo_api",
    phase: "first_month",
    dueDay: 14,
    audience: "company",
    addedInVersion: 1,
  },
  {
    id: "jira-access",
    title: "Jira access available",
    description: "Your Atlassian account is linked in Metrio",
    category: "jira",
    source: "jira",
    completionMode: "jira_api",
    phase: "first_day",
    dueDay: 3,
    jiraSignal: "access",
    audience: "company",
    addedInVersion: 1,
  },
  {
    id: "jira-first-assignment",
    title: "First Jira task assigned",
    description: "Context milestone — not a required HR step",
    category: "jira",
    source: "jira",
    completionMode: "jira_api",
    phase: "first_week",
    jiraSignal: "first_assignment",
    isMilestone: true,
    audience: "company",
    addedInVersion: 1,
  },
  {
    id: "design-handbook-read",
    title: "Read Design Team Handbook",
    category: "knowledge",
    source: "confluence",
    completionMode: "confluence_explicit",
    phase: "first_month",
    dueDay: 30,
    resourceId: "design-handbook",
    audience: "department",
    audienceKey: "design",
    addedInVersion: 1,
  },
  {
    id: "engineering-handbook-read",
    title: "Read Engineering handbook",
    category: "knowledge",
    source: "confluence",
    completionMode: "confluence_explicit",
    phase: "first_month",
    dueDay: 30,
    resourceId: "engineering-handbook",
    audience: "department",
    audienceKey: "engineering",
    addedInVersion: 1,
  },
  {
    id: "feedback-onboarding-30",
    title: "Complete 30-day onboarding feedback",
    category: "feedback",
    source: "feedback",
    completionMode: "feedback_state",
    phase: "before_day_60",
    dueDay: 30,
    feedbackTemplateId: "tpl_onboarding_30",
    feedbackDueDay: 30,
    audience: "company",
    addedInVersion: 1,
  },
];
