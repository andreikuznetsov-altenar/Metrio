import {
  ONBOARDING_CHECKLIST_CONFIG_VERSION,
  type ChecklistItemDefinition,
  ONBOARDING_CHECKLIST_DEFINITIONS,
} from "../../config/onboardingChecklistDefinitions";

export interface ChecklistAudienceInput {
  department?: string;
  location?: string;
  teamLabel?: string;
  dayNumber: number;
}

function normalize(value?: string): string {
  return (value || "").trim().toLowerCase();
}

export function matchChecklistDefinitions(
  input: ChecklistAudienceInput,
  definitions: ChecklistItemDefinition[] = ONBOARDING_CHECKLIST_DEFINITIONS,
): ChecklistItemDefinition[] {
  const dept = normalize(input.department);
  const location = normalize(input.location);
  const team = normalize(input.teamLabel);

  const matched: ChecklistItemDefinition[] = [];
  for (const def of definitions) {
    if (def.addedInVersion > ONBOARDING_CHECKLIST_CONFIG_VERSION) continue;
    if (input.dayNumber > 60) continue;

    let include = false;
    switch (def.audience) {
      case "company":
        include = true;
        break;
      case "department":
        include =
          Boolean(def.audienceKey) &&
          (dept === def.audienceKey || dept.includes(def.audienceKey!));
        break;
      case "location":
        include =
          Boolean(def.audienceKey) &&
          (location === def.audienceKey || location.includes(def.audienceKey!));
        break;
      case "team":
        include =
          Boolean(def.audienceKey) &&
          (team === def.audienceKey || team.includes(def.audienceKey!));
        break;
      default:
        include = false;
    }
    if (include) matched.push(def);
  }

  if (!matched.length) {
    return definitions.filter((d) => d.audience === "company");
  }
  return matched;
}
