import { describe, expect, it } from "vitest";
import { applyValidatedCompanyConfig } from "./applyCompanyConfig";
import { buildDefaultCompanyConfig } from "./buildDefaultCompanyConfig";
import { buildEffectiveConfig } from "./buildEffectiveConfig";
import { isCompanyAdmin, resolveAdminIdentity } from "./companyAdmin";
import { EMPTY_COMPANY_CONFIG_CACHE } from "./normalizeCompanyConfigCache";
import { validateCompanyConfig } from "./validateCompanyConfig";
import { DEFAULT_PREFERENCES } from "../../platform/preferences";

describe("company config", () => {
  it("validates builtin default", () => {
    const result = validateCompanyConfig(buildDefaultCompanyConfig());
    expect(result.ok).toBe(true);
  });

  it("rejects javascript URLs", () => {
    const base = buildDefaultCompanyConfig();
    const bad = {
      ...base,
      resources: [
        {
          ...base.resources[0],
          target: { kind: "external", url: "javascript:alert(1)" },
        },
      ],
    };
    const result = validateCompanyConfig(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects secret fields", () => {
    const result = validateCompanyConfig({
      apiKey: "secret",
      company: { displayName: "X" },
      resources: [],
      onboarding: { newStarterDays: 60, feedbackOnboardingDays: [30], checklistItems: [] },
      feedback: { templates: [] },
    });
    expect(result.ok).toBe(false);
  });

  it("admin from explicit email only", () => {
    const config = buildDefaultCompanyConfig();
    config.accessPolicy.companyAdmins = { emails: ["admin@test.com"] };
    const identity = resolveAdminIdentity(
      { person: { id: "1", name: "Lead", role: "lead" }, jobTitle: "CEO" },
      "admin@test.com",
    );
    expect(isCompanyAdmin(identity, config.accessPolicy)).toBe(true);
    const employee = resolveAdminIdentity(
      { person: { id: "2", name: "Emp", role: "employee" }, jobTitle: "CEO" },
      "other@test.com",
    );
    expect(isCompanyAdmin(employee, config.accessPolicy)).toBe(false);
  });

  it("invalid apply keeps previous cache", () => {
    const applied = applyValidatedCompanyConfig(EMPTY_COMPANY_CONFIG_CACHE, {
      company: { displayName: "" },
    });
    expect(applied.applied).toBe(false);
    expect(applied.cache.active.company.displayName).toBe("Altenar");
  });

  it("effective config merges managed operational rules", () => {
    const company = buildDefaultCompanyConfig();
    company.defaults.managedFields["taskAttention.reviewAttentionDays"] = "managed";
    company.defaults.rules.taskAttention.reviewAttentionDays = 7;
    const prefs = {
      ...DEFAULT_PREFERENCES,
      operationalRules: {
        ...DEFAULT_PREFERENCES.operationalRules,
        taskAttention: {
          ...DEFAULT_PREFERENCES.operationalRules.taskAttention,
          reviewAttentionDays: 10,
        },
      },
    };
    const effective = buildEffectiveConfig({
      company,
      prefs,
      currentUser: { person: { id: "e", name: "E", role: "employee" } },
      capabilities: {
        jiraConfigured: true,
        bambooConfigured: true,
        googleFeedbackConfigured: true,
      },
    });
    expect(effective.operationalRules.taskAttention.reviewAttentionDays).toBe(7);
  });

  it("local config cannot grant org scope by itself", () => {
    const company = buildDefaultCompanyConfig();
    company.accessPolicy.organizationScopeAllowlist = {
      emails: ["anyone@test.com"],
    };
    const effective = buildEffectiveConfig({
      company,
      prefs: DEFAULT_PREFERENCES,
      currentUser: { person: { id: "x", name: "X", role: "employee" } },
      capabilities: {
        jiraConfigured: true,
        bambooConfigured: true,
        googleFeedbackConfigured: false,
      },
    });
    expect(effective.features.feedback).toBe(true);
    expect(effective.isCompanyAdmin).toBe(false);
  });

  it("disables feedback when company feature flag is off", () => {
    const company = buildDefaultCompanyConfig();
    company.features.feedback = false;
    const effective = buildEffectiveConfig({
      company,
      prefs: DEFAULT_PREFERENCES,
      currentUser: { person: { id: "x", name: "X", role: "employee" } },
      capabilities: {
        jiraConfigured: true,
        bambooConfigured: true,
        googleFeedbackConfigured: true,
      },
    });
    expect(effective.features.feedback).toBe(false);
  });
});
