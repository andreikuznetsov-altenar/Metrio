import type { OnboardingChecklistModel } from "./onboardingChecklistTypes";

export interface OnboardingReminderCandidate {
  itemId: string;
  title: string;
  kind: "onboarding_step_due" | "onboarding_feedback_due";
  dedupeKey: string;
  dueDay: number;
  trigger: "due" | "overdue_3d";
}

export function collectOnboardingReminders(
  model: OnboardingChecklistModel,
): OnboardingReminderCandidate[] {
  const day = model.dayNumber;
  const out: OnboardingReminderCandidate[] = [];

  for (const item of model.items) {
    if (item.status === "complete" || item.isMilestone) continue;
    if (item.dueDay == null) continue;

    const kind =
      item.category === "feedback"
        ? "onboarding_feedback_due"
        : "onboarding_step_due";

    if (day === item.dueDay) {
      out.push({
        itemId: item.id,
        title: item.title,
        kind,
        dueDay: item.dueDay,
        trigger: "due",
        dedupeKey: `onboarding:${kind}:${item.id}:due:${item.dueDay}`,
      });
    } else if (day === item.dueDay + 3) {
      out.push({
        itemId: item.id,
        title: item.title,
        kind,
        dueDay: item.dueDay,
        trigger: "overdue_3d",
        dedupeKey: `onboarding:${kind}:${item.id}:overdue3:${item.dueDay}`,
      });
    }
  }

  return out;
}

export function daysUntilFeedbackDue(
  model: OnboardingChecklistModel,
  templateItemId = "feedback-onboarding-30",
): number | null {
  const item = model.items.find((i) => i.id === templateItemId);
  if (!item || item.status === "complete" || item.dueDay == null) return null;
  return item.dueDay - model.dayNumber;
}
