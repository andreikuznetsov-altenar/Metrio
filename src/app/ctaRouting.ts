import type { TeamPerformanceView } from "../domain/performance";
import {
  dispatchAppRoute,
  dispatchEmployeeView,
  navigatePerformanceView,
} from "./actionNavigation";

export type CtaRoutingEvent =
  | { type: "metrio-navigate-route"; route: "home" | "performance" | "feedback" }
  | { type: "metrio-open-performance-tab"; tab: TeamPerformanceView }
  | {
      type: "metrio-open-employee-view";
      view: "overview" | "my-week" | "goals" | "trends" | "work-history";
    }
  | { type: "metrio-open-person-brief"; personId: string }
  | { type: "metrio-open-person"; personId: string }
  | { type: "metrio-open-external"; url: string }
  | { type: "metrio-open-settings"; section: "connections" };

export function collectCtaRoutingEvents(
  action: () => void,
): CtaRoutingEvent[] {
  const events: CtaRoutingEvent[] = [];
  const dispatchEvent = window.dispatchEvent.bind(window);
  window.dispatchEvent = (event: Event) => {
    if (event.type === "metrio-navigate-route") {
      events.push({
        type: "metrio-navigate-route",
        route: (event as CustomEvent).detail,
      });
    } else if (event.type === "metrio-open-performance-tab") {
      events.push({
        type: "metrio-open-performance-tab",
        tab: (event as CustomEvent<TeamPerformanceView>).detail,
      });
    } else if (event.type === "metrio-open-employee-view") {
      events.push({
        type: "metrio-open-employee-view",
        view: (event as CustomEvent).detail,
      });
    } else if (event.type === "metrio-open-person-brief") {
      const detail = (event as CustomEvent<{ personId: string }>).detail;
      events.push({ type: "metrio-open-person-brief", personId: detail.personId });
    } else if (event.type === "metrio-open-person") {
      events.push({
        type: "metrio-open-person",
        personId:
          typeof (event as CustomEvent).detail === "string"
            ? (event as CustomEvent<string>).detail
            : (event as CustomEvent<{ personId: string }>).detail.personId,
      });
    }
    return dispatchEvent(event);
  };
  try {
    action();
  } finally {
    window.dispatchEvent = dispatchEvent;
  }
  return events;
}

export function navigateOpenGoals(options: { teamView: boolean }): void {
  if (options.teamView) {
    navigatePerformanceView("goals");
    return;
  }
  dispatchAppRoute("performance");
  dispatchEmployeeView("goals");
}

export function navigateOpenDeliveryRisk(): void {
  navigatePerformanceView("delivery-risk");
}

export function navigateOpenTeamOverview(): void {
  navigatePerformanceView("overview");
}

export function navigateOpenTeamBrief(personId: string): void {
  window.dispatchEvent(
    new CustomEvent("metrio-open-person-brief", { detail: { personId } }),
  );
}

export function navigateViewPerson(personId: string): void {
  window.dispatchEvent(new CustomEvent("metrio-open-person", { detail: personId }));
}
