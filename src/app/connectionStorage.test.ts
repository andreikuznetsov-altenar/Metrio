import { describe, expect, it, beforeEach, vi } from "vitest";
import { COMPANY_CONFIG } from "../config/company";

vi.mock("../platform/secureStorage", () => {
  const store = new Map<string, string>();
  return {
    SECRET_KEYS: {
      JIRA_API_TOKEN: "jira_api_token",
      BAMBOO_API_TOKEN: "bamboo_api_token",
    },
    secureStoreSet: vi.fn(async (key: string, secret: string) => {
      store.set(key, secret);
    }),
    secureStoreDelete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    secureStoreHas: vi.fn(async (key: string) => store.has(key)),
  };
});

vi.mock("./connectAndContinue", () => ({
  connectAndContinue: vi.fn(async () => undefined),
}));

import {
  clearConnection,
  isAppConnected,
  readSavedConnection,
  saveConnection,
} from "./connectionStorage";

describe("connectionStorage", () => {
  beforeEach(async () => {
    await clearConnection();
    localStorage.clear();
  });

  it("marks app connected after save without persisting secrets in localStorage", async () => {
    await saveConnection(
      { workEmail: "user@altenar.com" },
      { jiraToken: "secret-token", bambooApiKey: "secret-key" },
    );

    expect(isAppConnected()).toBe(true);
    const saved = await readSavedConnection();
    expect(saved?.workEmail).toBe("user@altenar.com");
    expect(saved?.jiraBaseUrl).toBe(COMPANY_CONFIG.jiraBaseUrl);
    expect(saved?.bambooSubdomain).toBe(COMPANY_CONFIG.bambooSubdomain);
    expect(saved?.hasJiraToken).toBe(true);
    expect(saved?.hasBambooApiKey).toBe(true);
    expect(localStorage.getItem("metrio-connection-jira-token")).toBeNull();
  });
});
