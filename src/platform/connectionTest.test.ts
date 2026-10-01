import { describe, expect, it, vi, beforeEach } from "vitest";
import { testBambooConnectionSaved, testJiraConnectionSaved } from "./connectionTest";

vi.mock("../app/connectionStorage", () => ({
  readSavedConnection: vi.fn(),
}));

vi.mock("../services/jira/jiraClient", () => ({
  JiraClient: vi.fn().mockImplementation(() => ({
    testConnection: vi.fn(async () => ({
      displayName: "Alex",
    })),
  })),
}));

vi.mock("../services/bamboo/bambooClient", () => ({
  BambooClient: vi.fn().mockImplementation(() => ({
    testConnection: vi.fn(async () => ({ ok: true })),
  })),
}));

import { readSavedConnection } from "../app/connectionStorage";
import { JiraClient } from "../services/jira/jiraClient";

const mockSaved = vi.mocked(readSavedConnection);

describe("connectionTest", () => {
  beforeEach(() => {
    mockSaved.mockReset();
  });

  it("reports needs attention when Jira token missing", async () => {
    mockSaved.mockResolvedValue({
      workEmail: "a@altenar.com",
      jiraBaseUrl: "https://x.atlassian.net",
      bambooSubdomain: "x",
      hasJiraToken: false,
      hasBambooApiKey: true,
    });
    const result = await testJiraConnectionSaved();
    expect(result.label).toBe("Needs attention");
  });

  it("reports connected on successful Jira test", async () => {
    mockSaved.mockResolvedValue({
      workEmail: "a@altenar.com",
      jiraBaseUrl: "https://x.atlassian.net",
      bambooSubdomain: "x",
      hasJiraToken: true,
      hasBambooApiKey: true,
    });
    const result = await testJiraConnectionSaved();
    expect(result.label).toBe("Connected");
    expect(JiraClient).toHaveBeenCalled();
  });

  it("reports connected on successful Bamboo test", async () => {
    mockSaved.mockResolvedValue({
      workEmail: "a@altenar.com",
      jiraBaseUrl: "https://x.atlassian.net",
      bambooSubdomain: "x",
      hasJiraToken: true,
      hasBambooApiKey: true,
    });
    const result = await testBambooConnectionSaved();
    expect(result.label).toBe("Connected");
  });
});
