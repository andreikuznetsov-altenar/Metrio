import { invoke } from "@tauri-apps/api/core";
import {
  EMPTY_ONBOARDING_CHECKLIST_DATA,
  normalizeOnboardingChecklistData,
} from "../../domain/onboardingChecklist/normalizeOnboardingChecklistData";
import type { OnboardingChecklistDataFile } from "../../domain/onboardingChecklist/onboardingChecklistTypes";

const VISUAL_ONBOARDING_KEY = "metrio-visual-onboarding-checklist";

function isVisualFixtureBuild(): boolean {
  return import.meta.env.VITE_VISUAL_FIXTURE === "1";
}

export async function loadOnboardingChecklistData(): Promise<OnboardingChecklistDataFile> {
  if (isVisualFixtureBuild() && typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(VISUAL_ONBOARDING_KEY);
    if (raw) {
      return normalizeOnboardingChecklistData(JSON.parse(raw) as Partial<OnboardingChecklistDataFile>);
    }
  }
  try {
    const raw = await invoke<Partial<OnboardingChecklistDataFile>>(
      "onboarding_checklist_data_load",
    );
    return normalizeOnboardingChecklistData(raw);
  } catch {
    return EMPTY_ONBOARDING_CHECKLIST_DATA;
  }
}

export async function saveOnboardingChecklistData(
  data: OnboardingChecklistDataFile,
): Promise<void> {
  const payload = normalizeOnboardingChecklistData(data);
  if (isVisualFixtureBuild() && typeof localStorage !== "undefined") {
    localStorage.setItem(VISUAL_ONBOARDING_KEY, JSON.stringify(payload));
    return;
  }
  await invoke("onboarding_checklist_data_save", { data: payload });
}
