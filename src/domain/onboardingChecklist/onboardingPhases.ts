import type { OnboardingPhase } from "./onboardingChecklistTypes";

export const ONBOARDING_PHASE_LABELS: Record<OnboardingPhase, string> = {
  first_day: "First day",
  first_week: "First week",
  first_month: "First month",
  before_day_60: "Before day 60",
};

export const ONBOARDING_PHASE_ORDER: OnboardingPhase[] = [
  "first_day",
  "first_week",
  "first_month",
  "before_day_60",
];

export function formatSuggestedDueLabel(dueDay: number): string {
  return `Suggested by Day ${dueDay}`;
}

export function phaseForDueDay(dueDay?: number): OnboardingPhase {
  if (dueDay == null) return "before_day_60";
  if (dueDay <= 1) return "first_day";
  if (dueDay <= 7) return "first_week";
  if (dueDay <= 30) return "first_month";
  return "before_day_60";
}
