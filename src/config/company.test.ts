import { describe, expect, it } from "vitest";
import {
  BAMBOO_BASE_URL,
  BAMBOO_SUBDOMAIN,
  JIRA_BASE_URL,
} from "./company";

describe("company config", () => {
  it("uses fixed Altenar endpoints", () => {
    expect(JIRA_BASE_URL).toBe("https://altenar.atlassian.net");
    expect(BAMBOO_BASE_URL).toBe("https://altenar.bamboohr.com");
    expect(BAMBOO_SUBDOMAIN).toBe("altenar");
  });
});
