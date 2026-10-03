import { describe, expect, it } from "vitest";
import { buildSupportBundleFiles } from "./supportBundle";
import { DEFAULT_PREFERENCES } from "../preferences";
import type { SurveyDataFile } from "../../domain/survey/types";

const FAKE_JIRA_TOKEN = "jira-api-token-ABCDEF1234567890";
const FAKE_BAMBOO_KEY = "bamboo-super-secret-key-zzzz";

const emptySurvey: SurveyDataFile = {
  surveys: [],
  activeSurveyId: null,
  defaults: {
    reminderDays: [7, 3, 1],
    emailCollectionMode: "RESPONDER_INPUT",
    responseAccess: "anyone_with_link",
  },
};

describe("support bundle secret leak", () => {
  it("does not contain injected secret strings", async () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      jiraEmail: "lead@example.com",
      workEmail: "lead@example.com",
      credentials: {
        ...DEFAULT_PREFERENCES.credentials,
        jiraConfigured: true,
        bambooConfigured: true,
      },
    };

    const { files } = await buildSupportBundleFiles({
      prefs,
      teamDetection: null,
      teamSnapshot: null,
      surveyData: emptySurvey,
      forbiddenSecrets: [FAKE_JIRA_TOKEN, FAKE_BAMBOO_KEY],
    });

    const blob = files.map((f) => f.content).join("\n");
    expect(blob).not.toContain(FAKE_JIRA_TOKEN);
    expect(blob).not.toContain(FAKE_BAMBOO_KEY);
    expect(blob).not.toContain("lead@example.com");
  });
});
