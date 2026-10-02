import { describe, expect, it } from "vitest";
import { buildOnboardingChecklist } from "./buildOnboardingChecklist";
import { evaluateChecklistItem } from "./evaluateItemCompletion";
import { ONBOARDING_CHECKLIST_DEFINITIONS } from "../../config/onboardingChecklistDefinitions";
import { buildManagerOnboardingRow, redactManagerChecklistItem } from "./managerChecklistView";
import { collectOnboardingReminders } from "./onboardingReminders";
import { isNewStarter } from "../onboarding/newStarter";
import type { Person } from "../people/types";
import { EMPTY_ONBOARDING_CHECKLIST_DATA, getAccountState } from "./normalizeOnboardingChecklistData";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: "e1",
    bamboo: {
      id: "e1",
      displayName: "Daria Test",
      firstName: "Daria",
      lastName: "Test",
      workEmail: "daria@test.com",
      jobTitle: "Product Designer",
      department: "Design",
      hireDate: "2026-09-14",
      status: "Active",
    },
    jira: {
      accountId: "jira-1",
      displayName: "Daria",
      email: "daria@test.com",
      canonicalKey: "daria@test.com",
    },
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: null,
    performance: null,
    issues: [],
    ownedIssues: [{ issueKey: "UX-1", issueSummary: "Task", issueCreated: "", assigneeName: "", issueTypeName: "Task", contentType: "none", designImprovementType: "", epicKey: "", epicSummary: "", epicStatus: "", epicContentType: "", epicDesignImprovementType: "", events: [], rangeEvents: [], currentStatus: "Open" }],
    ...overrides,
  } as Person;
}

const bambooClear = { evaluated: true, pendingOnboarding: false, pendingDocumentCount: 0 };
const bambooPending = { evaluated: true, pendingOnboarding: true, pendingDocumentCount: 0 };

describe("onboarding checklist", () => {
  it("active for new starter under 60 days", () => {
    const model = buildOnboardingChecklist({
      person: person(),
      accountState: getAccountState(EMPTY_ONBOARDING_CHECKLIST_DATA, "e1"),
      bamboo: bambooClear,
      surveyData: null,
      jiraBaseUrl: "https://jira.example.com",
      now: new Date("2026-10-02"),
    });
    expect(model).not.toBeNull();
    expect(model!.dayNumber).toBe(19);
    expect(model!.progress.total).toBeGreaterThan(0);
  });

  it("hidden after day 60", () => {
    expect(isNewStarter("2026-01-01", new Date("2026-03-15"))).toBe(false);
    const model = buildOnboardingChecklist({
      person: person({
        bamboo: {
          ...person().bamboo,
          hireDate: "2026-01-01",
        },
      }),
      accountState: null,
      bamboo: bambooClear,
      surveyData: null,
      jiraBaseUrl: "https://jira.example.com",
      now: new Date("2026-03-15"),
    });
    expect(model).toBeNull();
  });

  it("manual item completes only when marked", () => {
    const def = ONBOARDING_CHECKLIST_DEFINITIONS.find((d) => d.id === "team-meet")!;
    const pending = evaluateChecklistItem({
      def,
      person: person(),
      employeeEmail: "daria@test.com",
      bamboo: bambooClear,
      surveyData: null,
    });
    expect(pending.status).toBe("pending");
    const done = evaluateChecklistItem({
      def,
      person: person(),
      employeeEmail: "daria@test.com",
      manual: { completedAt: "2026-10-01T00:00:00.000Z" },
      bamboo: bambooClear,
      surveyData: null,
    });
    expect(done.status).toBe("complete");
  });

  it("bamboo item auto-completes when API signals clear", () => {
    const def = ONBOARDING_CHECKLIST_DEFINITIONS.find((d) => d.id === "bamboo-hr-onboarding")!;
    const item = evaluateChecklistItem({
      def,
      person: person(),
      employeeEmail: "daria@test.com",
      bamboo: bambooClear,
      surveyData: null,
    });
    expect(item.autoCompleted).toBe(true);
    const pending = evaluateChecklistItem({
      def,
      person: person(),
      employeeEmail: "daria@test.com",
      bamboo: bambooPending,
      surveyData: null,
    });
    expect(pending.status).toBe("pending");
  });

  it("jira access requires linked account", () => {
    const def = ONBOARDING_CHECKLIST_DEFINITIONS.find((d) => d.id === "jira-access")!;
    const withJira = evaluateChecklistItem({
      def,
      person: person(),
      employeeEmail: "daria@test.com",
      bamboo: bambooClear,
      surveyData: null,
    });
    expect(withJira.status).toBe("complete");
    const noJira = evaluateChecklistItem({
      def,
      person: person({ jira: null }),
      employeeEmail: "daria@test.com",
      bamboo: bambooClear,
      surveyData: null,
    });
    expect(noJira.status).toBe("pending");
  });

  it("confluence handbook stays manual", () => {
    const def = ONBOARDING_CHECKLIST_DEFINITIONS.find((d) => d.id === "design-handbook-read")!;
    const item = evaluateChecklistItem({
      def,
      person: person(),
      employeeEmail: "daria@test.com",
      bamboo: bambooClear,
      surveyData: null,
    });
    expect(item.completionMode).toBe("confluence_explicit");
    expect(item.status).toBe("pending");
    expect(item.canManualComplete).toBe(true);
  });

  it("feedback completes from survey response", () => {
    const def = ONBOARDING_CHECKLIST_DEFINITIONS.find((d) => d.id === "feedback-onboarding-30")!;
    const item = evaluateChecklistItem({
      def,
      person: person(),
      employeeEmail: "daria@test.com",
      bamboo: bambooClear,
      surveyData: {
        schemaVersion: 2,
        defaults: {
          title: "",
          emailSubject: "",
          introText: "",
          buttonLabel: "",
          signature: "",
          questions: [],
          emailCollectionMode: "VERIFIED",
          responseAccess: "restricted",
        },
        activeSurveyId: "s1",
        surveys: [
          {
            id: "s1",
            title: "30d",
            status: "active",
            templateId: "tpl_onboarding_30",
            googleFormId: null,
            responderUri: null,
            createdAt: "",
            updatedAt: "",
            dateFrom: "",
            dateTo: "",
            scope: "direct",
            projects: [],
            emailSubject: "",
            introText: "",
            buttonLabel: "",
            signature: "",
            questions: [],
            responses: [],
            sendBatches: [],
            questionsLocked: false,
            emailsSent: true,
            lastResponseSyncAt: null,
            error: null,
            recipients: [
              {
                id: "r1",
                reporterAccountId: "a",
                reporterName: "Daria",
                reporterEmail: "daria@test.com",
                issueKeys: [],
                projects: [],
                emailSource: "bamboo",
                selected: true,
                status: "responded",
                sentAt: "2026-10-01",
                respondedAt: "2026-10-02",
                gmailMessageId: null,
                sendBatchId: null,
                error: null,
                notes: null,
                lastReminderAt: null,
                reminderCount: 0,
                lastReminderError: null,
              },
            ],
          },
        ],
      },
    });
    expect(item.status).toBe("complete");
  });

  it("manager view redacts bamboo document detail", () => {
    const model = buildOnboardingChecklist({
      person: person(),
      accountState: getAccountState(EMPTY_ONBOARDING_CHECKLIST_DATA, "e1"),
      bamboo: bambooPending,
      surveyData: null,
      jiraBaseUrl: "https://jira.example.com",
      now: new Date("2026-10-02"),
    })!;
    const bambooItem = model.items.find((i) => i.category === "bamboo")!;
    const redacted = redactManagerChecklistItem({
      ...bambooItem,
      title: "Sign Information Security Policy",
    });
    expect(redacted.title).toBe("BambooHR onboarding");
    const row = buildManagerOnboardingRow("e1", "Daria", model);
    expect(row.progressLabel).toMatch(/\d+\/\d+/);
  });

  it("preserves manual completion across config version", () => {
    const file = {
      schemaVersion: 1,
      accounts: {
        e1: {
          employeeId: "e1",
          manualCompletions: {
            "team-meet": { completedAt: "2026-09-20T00:00:00.000Z" },
          },
        },
      },
    };
    const model = buildOnboardingChecklist({
      person: person(),
      accountState: getAccountState(file, "e1"),
      bamboo: bambooClear,
      surveyData: null,
      jiraBaseUrl: "https://jira.example.com",
      now: new Date("2026-10-02"),
    })!;
    const meet = model.items.find((i) => i.id === "team-meet");
    expect(meet?.status).toBe("complete");
  });

  it("reminder dedupe keys for due and overdue", () => {
    const model = buildOnboardingChecklist({
      person: person(),
      accountState: getAccountState(EMPTY_ONBOARDING_CHECKLIST_DATA, "e1"),
      bamboo: bambooClear,
      surveyData: null,
      jiraBaseUrl: "https://jira.example.com",
      now: new Date("2026-09-20"),
    })!;
    const reminders = collectOnboardingReminders(model);
    expect(reminders.some((r) => r.trigger === "due")).toBe(true);
  });
});
