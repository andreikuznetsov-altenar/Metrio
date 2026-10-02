import {
  ONBOARDING_CHECKLIST_DATA_SCHEMA_VERSION,
  type OnboardingAccountState,
  type OnboardingChecklistDataFile,
} from "./onboardingChecklistTypes";

export const EMPTY_ONBOARDING_CHECKLIST_DATA: OnboardingChecklistDataFile = {
  schemaVersion: ONBOARDING_CHECKLIST_DATA_SCHEMA_VERSION,
  accounts: {},
};

function normalizeAccount(raw: Partial<OnboardingAccountState>): OnboardingAccountState {
  return {
    employeeId: String(raw.employeeId ?? ""),
    manualCompletions: raw.manualCompletions ?? {},
  };
}

export function normalizeOnboardingChecklistData(
  raw: Partial<OnboardingChecklistDataFile> | null | undefined,
): OnboardingChecklistDataFile {
  if (!raw || typeof raw !== "object") return EMPTY_ONBOARDING_CHECKLIST_DATA;
  const accounts: Record<string, OnboardingAccountState> = {};
  for (const [key, value] of Object.entries(raw.accounts ?? {})) {
    accounts[key] = normalizeAccount(value as Partial<OnboardingAccountState>);
  }
  return {
    schemaVersion:
      raw.schemaVersion ?? ONBOARDING_CHECKLIST_DATA_SCHEMA_VERSION,
    accounts,
  };
}

export function getAccountState(
  file: OnboardingChecklistDataFile,
  accountKey: string,
): OnboardingAccountState {
  return (
    file.accounts[accountKey] ?? {
      employeeId: accountKey,
      manualCompletions: {},
    }
  );
}
