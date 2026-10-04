import type { OnboardingItem, ManagerOnboardingProgressRow } from "./onboardingChecklistTypes";
import type { OnboardingChecklistModel } from "./onboardingChecklistTypes";
import { formatNewStarterHeadline } from "../onboarding/newStarter";

export function redactManagerChecklistItem(item: OnboardingItem): OnboardingItem {
  if (item.category === "bamboo" && item.completionMode === "bamboo_api") {
    return {
      ...item,
      title: "BambooHR onboarding",
      description: item.status === "complete"
        ? "Completed in BambooHR"
        : "Action pending in BambooHR",
    };
  }
  return item;
}

export function buildManagerOnboardingRow(
  personId: string,
  personName: string,
  model: OnboardingChecklistModel,
): ManagerOnboardingProgressRow {
  const safeItems = model.items.map(redactManagerChecklistItem);
  const countable = safeItems.filter((i) => !i.isMilestone);
  const complete = countable.filter((i) => i.status === "complete").length;
  const remaining = countable.filter((i) => i.status !== "complete");
  const remainingTitles = remaining.slice(0, 3).map((i) => i.title);

  return {
    personId,
    personName,
    dayLabel: formatNewStarterHeadline(model.hireDate).replace("Getting started · ", ""),
    progressLabel: `${complete}/${countable.length}`,
    stepsCompleteLabel: `${complete} of ${countable.length} onboarding steps complete`,
    actionsRemainingLabel: `${remaining.length} action${remaining.length === 1 ? "" : "s"} remaining`,
    remainingTitles,
  };
}
