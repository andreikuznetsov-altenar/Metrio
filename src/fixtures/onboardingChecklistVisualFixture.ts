import { EMPTY_ONBOARDING_CHECKLIST_DATA } from "../domain/onboardingChecklist/normalizeOnboardingChecklistData";

export function serializeOnboardingChecklistVisualFixtureForPlaywright(): string {
  const payload = {
    ...EMPTY_ONBOARDING_CHECKLIST_DATA,
    accounts: {
      "person-alex": {
        employeeId: "person-alex",
        manualCompletions: {
          "company-welcome": { completedAt: "2026-09-16T10:00:00.000Z" },
          "team-meet": { completedAt: "2026-09-18T10:00:00.000Z" },
        },
      },
    },
  };
  return JSON.stringify(payload);
}
