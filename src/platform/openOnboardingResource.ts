import { bambooPortalResourceUrl } from "../config/onboardingResources";
import type { OnboardingResourceTarget } from "../domain/onboarding/resourceTypes";
import { openExternalUrl } from "./openExternal";

export const OPEN_RESOURCES_EVENT = "metrio-open-resources";

export function dispatchOpenResourceLibrary(): void {
  window.dispatchEvent(new CustomEvent(OPEN_RESOURCES_EVENT));
}

export async function openOnboardingResourceTarget(
  target: OnboardingResourceTarget,
): Promise<void> {
  switch (target.kind) {
    case "external":
    case "jira_project":
    case "confluence_page":
    case "confluence_space":
      if (target.url) {
        await openExternalUrl(target.url);
      }
      return;
    case "bamboo_portal":
      await openExternalUrl(bambooPortalResourceUrl());
      return;
    case "metrio_resources":
      dispatchOpenResourceLibrary();
      return;
    default:
      return;
  }
}
