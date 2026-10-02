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
  const remainingTitles = countable
    .filter((i) => i.status !== "complete")
    .slice(0, 3)
    .map((i) => i.title);

  return {
    personId,
    personName,
    dayLabel: formatNewStarterHeadline(model.hireDate).replace("Getting started · ", ""),
    progressLabel: `${complete}/${countable.length}`,
    remainingTitles,
  };
}
