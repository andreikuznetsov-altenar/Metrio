import type { OrganizationSignalTarget } from "../domain/organization/organizationTypes";
import { dispatchFeedbackTab } from "./actionNavigation";

export interface DirectorNavigationHandlers {
  setDirectorView: (view: "overview" | "teams" | "signals" | "delivery") => void;
  setDeliveryTeamFilter: (teamId: string | undefined, filter?: "review" | "all") => void;
  setSelectedTeamId: (teamId: string | undefined) => void;
  openPerson: (personId: string) => void;
}

export function navigateOrganizationSignalTarget(
  target: OrganizationSignalTarget,
  handlers: DirectorNavigationHandlers,
): void {
  switch (target.kind) {
    case "director-delivery":
      handlers.setDeliveryTeamFilter(target.teamId, target.filter);
      handlers.setDirectorView("delivery");
      return;
    case "director-teams":
      handlers.setSelectedTeamId(target.teamId);
      handlers.setDirectorView("teams");
      return;
    case "director-new-starters":
      handlers.setSelectedTeamId(target.teamId);
      handlers.setDirectorView("teams");
      return;
    case "feedback":
      dispatchFeedbackTab(target.tab);
      return;
    case "performance":
      if (target.view === "delivery-risk") {
        handlers.setDirectorView("delivery");
        return;
      }
      if (target.view === "radar" || target.view === "people") {
        handlers.setDirectorView("teams");
        return;
      }
      handlers.setDirectorView("overview");
      return;
    default:
      return;
  }
}
