import { describe, expect, it } from "vitest";
import {
  enrichInboxEvent,
  inboxActionRequiredForType,
  inboxSourceForType,
} from "./actionInboxModel";
import { inboxMatchesFilter } from "../../platform/notificationTypes";

describe("actionInboxModel", () => {
  it("maps sources and action required flags", () => {
    expect(inboxSourceForType("jira_assignment")).toBe("jira");
    expect(inboxSourceForType("bamboo_document_action")).toBe("bamboo");
    expect(inboxSourceForType("feedback_action")).toBe("feedback");
    expect(inboxActionRequiredForType("vacation_reminder")).toBe(false);
    expect(inboxActionRequiredForType("bamboo_document_action")).toBe(true);
  });

  it("filters unread and actions", () => {
    const unreadJira = enrichInboxEvent({
      id: "1",
      type: "jira_assignment",
      createdAt: "2026-10-02T00:00:00.000Z",
      title: "Assigned",
      message: "UX-1",
    });
    const readVacation = enrichInboxEvent({
      id: "2",
      type: "vacation_reminder",
      createdAt: "2026-10-02T00:00:00.000Z",
      title: "Vacation",
      message: "Soon",
      readAt: "2026-10-02T01:00:00.000Z",
    });
    expect(inboxMatchesFilter(unreadJira, "unread")).toBe(true);
    expect(inboxMatchesFilter(readVacation, "unread")).toBe(false);
    expect(inboxMatchesFilter(unreadJira, "actions")).toBe(true);
    expect(inboxMatchesFilter(readVacation, "actions")).toBe(false);
    expect(inboxMatchesFilter(unreadJira, "all", "bamboo")).toBe(false);
  });
});
