import type { NotificationEvent } from "../../platform/notificationTypes";

export interface BambooChecklistSignals {
  /** Bamboo sync ran and we evaluated inbox signals */
  evaluated: boolean;
  /** Unresolved bamboo_onboarding_action events */
  pendingOnboarding: boolean;
  pendingDocumentCount: number;
}

export function deriveBambooChecklistSignals(
  events: NotificationEvent[],
  bambooStale: boolean,
): BambooChecklistSignals {
  if (bambooStale) {
    return {
      evaluated: false,
      pendingOnboarding: true,
      pendingDocumentCount: 0,
    };
  }
  let pendingOnboarding = false;
  let pendingDocumentCount = 0;
  for (const event of events) {
    if (event.resolvedAt) continue;
    if (event.type === "bamboo_onboarding_action") pendingOnboarding = true;
    if (event.type === "bamboo_document_action") pendingDocumentCount += 1;
  }
  return {
    evaluated: true,
    pendingOnboarding,
    pendingDocumentCount,
  };
}
