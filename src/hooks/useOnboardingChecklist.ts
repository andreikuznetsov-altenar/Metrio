import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveJiraBaseUrl } from "../config/product";
import { useOptionalCompanyConfig } from "../app/CompanyConfigContext";
import { toCuratedResourceDefs } from "../domain/companyConfig/buildEffectiveConfig";
import { buildOnboardingChecklist } from "../domain/onboardingChecklist/buildOnboardingChecklist";
import { deriveBambooChecklistSignals } from "../domain/onboardingChecklist/bambooChecklistSignals";
import {
  getAccountState,
  normalizeOnboardingChecklistData,
} from "../domain/onboardingChecklist/normalizeOnboardingChecklistData";
import type { OnboardingChecklistModel } from "../domain/onboardingChecklist/onboardingChecklistTypes";
import type { Person } from "../domain/people/types";
import type { SurveyDataFile } from "../domain/survey/types";
import { listNotificationEvents } from "../platform/notificationEvents";
import { loadPreferences } from "../platform/preferences";
import {
  loadOnboardingChecklistData,
  saveOnboardingChecklistData,
} from "../services/onboarding/onboardingChecklistPersistence";

export function useOnboardingChecklist(
  person: Person | null | undefined,
  surveyData: SurveyDataFile | null | undefined,
) {
  const [file, setFile] = useState(normalizeOnboardingChecklistData(null));
  const [bambooStale, setBambooStale] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const companyConfig = useOptionalCompanyConfig();

  useEffect(() => {
    void loadOnboardingChecklistData().then((data) => {
      setFile(data);
      setLoaded(true);
    });
    void loadPreferences().then((prefs) => setBambooStale(prefs.sync.bambooStale));
  }, []);

  const model: OnboardingChecklistModel | null = useMemo(() => {
    if (!person) return null;
    if (companyConfig && !companyConfig.effective.features.onboarding) {
      return null;
    }
    const bamboo = deriveBambooChecklistSignals(
      listNotificationEvents(),
      bambooStale,
    );
    const accountKey = person.bamboo.id || person.id;
    const accountState = getAccountState(file, accountKey);
    return buildOnboardingChecklist({
      person,
      accountState,
      bamboo,
      surveyData,
      jiraBaseUrl: resolveJiraBaseUrl(),
      checklistDefinitions: companyConfig?.effective.checklistItems,
      resourceCatalog: companyConfig
        ? toCuratedResourceDefs(companyConfig.effective.resources)
        : undefined,
    });
  }, [person, file, surveyData, bambooStale, companyConfig]);

  const setManualComplete = useCallback(
    async (itemId: string, complete: boolean) => {
      if (!person) return;
      const accountKey = person.bamboo.id || person.id;
      const account = getAccountState(file, accountKey);
      const now = new Date().toISOString();
      const nextManual = { ...account.manualCompletions };
      if (complete) {
        nextManual[itemId] = { completedAt: now };
      } else {
        const prev = nextManual[itemId];
        if (prev) {
          nextManual[itemId] = { ...prev, undoneAt: now };
        }
      }
      const nextFile = normalizeOnboardingChecklistData({
        ...file,
        accounts: {
          ...file.accounts,
          [accountKey]: {
            ...account,
            employeeId: accountKey,
            manualCompletions: nextManual,
          },
        },
      });
      setFile(nextFile);
      await saveOnboardingChecklistData(nextFile);
    },
    [file, person],
  );

  return { model, loaded, file, setManualComplete, refreshBambooStale: setBambooStale };
}
