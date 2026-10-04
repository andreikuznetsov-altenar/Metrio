import type { FeedbackCycle } from "./feedbackCycleTypes";
import { humanizeMachineEnum } from "../../platform/humanizeDisplay";

export function feedbackCycleTypeLabel(type: FeedbackCycle["type"]): string {
  return humanizeMachineEnum(type);
}

export function feedbackCycleStatusLabel(status: FeedbackCycle["status"]): string {
  return humanizeMachineEnum(status);
}

export function feedbackCadenceUnitLabel(unit: string | undefined): string {
  if (!unit) return "—";
  return humanizeMachineEnum(unit);
}
