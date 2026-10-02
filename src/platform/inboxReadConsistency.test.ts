import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearNotificationEventsForTests,
  listNotificationEvents,
  recordNotificationEvent,
  seedNotificationEventsForTests,
} from "./notificationEvents";
import { markActionInboxItemRead, markAllActionInboxItemsRead } from "./inboxReadSync";
import {
  EMPTY_JIRA_ASSIGNMENT_STATE,
  unreadJiraAssignments,
} from "../domain/jira/jiraAssignmentTracking";

const savePreferences = vi.fn(async (prefs: unknown) => prefs);
const loadPreferences = vi.fn(async () => ({
  notificationState: {
    workloadLevels: {},
    vacationNotified: {},
    problematicCounts: {},
    jiraAssignment: {
      baselineComplete: true,
      knownAssignedIssueKeys: ["UX-6124"],
      records: {
        "UX-6124": {
          issueKey: "UX-6124",
          title: "Sportsbook navigation",
          type: "jira_assignment",
          assignedAt: "2026-10-02T10:00:00.000Z",
        },
      },
    },
  },
}));

vi.mock("./preferences", () => ({
  loadPreferences: () => loadPreferences(),
  savePreferences: (prefs: unknown) => savePreferences(prefs),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => undefined),
}));

describe("inbox read consistency", () => {
  beforeEach(() => {
    clearNotificationEventsForTests();
    savePreferences.mockClear();
    loadPreferences.mockClear();
  });

  it("marks Jira assignment read in inbox and prefs when opened from Notification Center", async () => {
    seedNotificationEventsForTests([
      {
        id: "inbox-jira",
        type: "jira_assignment",
        createdAt: "2026-10-02T10:05:00.000Z",
        title: "UX-6124 assigned to you",
        message: "Sportsbook navigation",
        issueKey: "UX-6124",
        target: { kind: "jira", issueKey: "UX-6124" },
        dedupeKey: "jira:assignment:UX-6124",
      },
    ]);

    await markActionInboxItemRead(listNotificationEvents()[0]);

    expect(listNotificationEvents()[0].readAt).toBeTruthy();
    const saved = savePreferences.mock.calls.at(-1)?.[0] as {
      notificationState: { jiraAssignment: typeof EMPTY_JIRA_ASSIGNMENT_STATE };
    };
    expect(
      unreadJiraAssignments(saved.notificationState.jiraAssignment),
    ).toHaveLength(0);
  });

  it("leaves tray Jira prefs unchanged for Bamboo inbox actions", async () => {
    const event = recordNotificationEvent({
      type: "bamboo_document_action",
      title: "Document requires signature",
      message: "Information Security Policy",
      dedupeKey: "bamboo:action:doc-1",
      target: { kind: "bamboo" },
    });

    await markActionInboxItemRead(event);

    expect(savePreferences).not.toHaveBeenCalled();
    expect(listNotificationEvents()[0].readAt).toBeTruthy();
  });

  it("mark all read clears Jira assignment prefs", async () => {
    seedNotificationEventsForTests([
      {
        id: "j1",
        type: "jira_assignment",
        createdAt: "2026-10-02T10:05:00.000Z",
        title: "A",
        message: "B",
        issueKey: "UX-6124",
      },
      {
        id: "b1",
        type: "vacation_reminder",
        createdAt: "2026-10-02T09:00:00.000Z",
        title: "Vacation",
        message: "Soon",
      },
    ]);

    await markAllActionInboxItemsRead();

    expect(listNotificationEvents().every((event) => event.readAt)).toBe(true);
    const saved = savePreferences.mock.calls.at(-1)?.[0] as {
      notificationState: { jiraAssignment: typeof EMPTY_JIRA_ASSIGNMENT_STATE };
    };
    expect(
      unreadJiraAssignments(saved.notificationState.jiraAssignment),
    ).toHaveLength(0);
  });
});
