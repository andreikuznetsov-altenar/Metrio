import {
  CURATED_ONBOARDING_RESOURCES,
  materializeCuratedResource,
} from "../../config/onboardingResources";
import { ONBOARDING_CHECKLIST_CONFIG_VERSION } from "../../config/onboardingChecklistDefinitions";
import { isNewStarter, newStarterDayNumber } from "../onboarding/newStarter";
import type { Person } from "../people/types";
import type { SurveyDataFile } from "../survey/types";
import type { BambooChecklistSignals } from "./bambooChecklistSignals";
import { evaluateChecklistItem } from "./evaluateItemCompletion";
import { matchChecklistDefinitions } from "./matchChecklistDefinitions";
import type {
  OnboardingAccountState,
  OnboardingChecklistModel,
  OnboardingItem,
  OnboardingItemCategory,
} from "./onboardingChecklistTypes";

const CATEGORY_ORDER: OnboardingItemCategory[] = [
  "company",
  "team",
  "tools",
  "knowledge",
  "bamboo",
  "jira",
  "feedback",
];

function targetForResourceId(
  resourceId: string,
  jiraBaseUrl: string,
  catalog: typeof CURATED_ONBOARDING_RESOURCES,
) {
  const def = catalog.find((r) => r.id === resourceId);
  if (!def) return undefined;
  const materialized = materializeCuratedResource(def, jiraBaseUrl);
  return materialized.target;
}

export interface BuildOnboardingChecklistInput {
  person: Person;
  accountState: OnboardingAccountState | null;
  bamboo: BambooChecklistSignals;
  surveyData: SurveyDataFile | null | undefined;
  jiraBaseUrl: string;
  checklistDefinitions?: import("../../config/onboardingChecklistDefinitions").ChecklistItemDefinition[];
  resourceCatalog?: typeof CURATED_ONBOARDING_RESOURCES;
  now?: Date;
}

export function buildOnboardingChecklist(
  input: BuildOnboardingChecklistInput,
): OnboardingChecklistModel | null {
  const hireDate = input.person.bamboo.hireDate;
  if (!hireDate || !isNewStarter(hireDate, input.now)) return null;

  const dayNumber = newStarterDayNumber(hireDate, input.now);
  const defs = matchChecklistDefinitions(
    {
      department: input.person.bamboo.department,
      dayNumber,
    },
    input.checklistDefinitions,
  );

  const accountKey = input.person.bamboo.id || input.person.id;
  const manual = input.accountState?.manualCompletions ?? {};
  const email = input.person.bamboo.workEmail;

  const catalog = input.resourceCatalog ?? CURATED_ONBOARDING_RESOURCES;
  const items: OnboardingItem[] = defs.map((def) =>
    evaluateChecklistItem({
      def,
      person: input.person,
      employeeEmail: email,
      manual: manual[def.id],
      bamboo: input.bamboo,
      surveyData: input.surveyData,
      target: def.resourceId
        ? targetForResourceId(def.resourceId, input.jiraBaseUrl, catalog)
        : def.category === "bamboo"
          ? { kind: "bamboo_portal" }
          : undefined,
    }),
  );

  const countable = items.filter((i) => !i.isMilestone);
  const complete = countable.filter((i) => i.status === "complete").length;
  const total = countable.length;

  const nextItems = items
    .filter((i) => i.status !== "complete" && !i.isMilestone)
    .sort((a, b) => (a.dueDay ?? 99) - (b.dueDay ?? 99))
    .slice(0, 3);

  const byCategory: Partial<Record<OnboardingItemCategory, OnboardingItem[]>> = {};
  for (const cat of CATEGORY_ORDER) {
    const rows = items.filter((i) => i.category === cat);
    if (rows.length) byCategory[cat] = rows;
  }

  return {
    accountKey,
    hireDate,
    dayNumber,
    active: true,
    configVersion: ONBOARDING_CHECKLIST_CONFIG_VERSION,
    items,
    progress: {
      complete,
      total,
      headline: `${complete} of ${total} steps complete`,
      nextItems,
    },
    byCategory,
  };
}
