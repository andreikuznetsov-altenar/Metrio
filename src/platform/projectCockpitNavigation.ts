export const PROJECT_COCKPIT_OPEN_EVENT = "metrio-open-project-cockpit";

export function openProjectCockpit(projectKey: string): void {
  window.dispatchEvent(
    new CustomEvent(PROJECT_COCKPIT_OPEN_EVENT, {
      detail: { projectKey: projectKey.toUpperCase() },
    }),
  );
}
