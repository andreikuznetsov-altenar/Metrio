import type { OnboardingChecklistModel } from "../domain/onboardingChecklist/onboardingChecklistTypes";
import { collectOnboardingReminders } from "../domain/onboardingChecklist/onboardingReminders";
import { recordNotificationEvent } from "./notificationEvents";

export function syncOnboardingChecklistInbox(model: OnboardingChecklistModel | null): void {
  if (!model) return;
  for (const reminder of collectOnboardingReminders(model)) {
    const title =
      reminder.kind === "onboarding_feedback_due"
        ? "Onboarding feedback due"
        : "Onboarding step due";
    recordNotificationEvent({
      type: reminder.kind,
      title,
      message: reminder.title,
      dedupeKey: reminder.dedupeKey,
      target: { kind: "home" },
      actionRequired: false,
    });
  }
}
