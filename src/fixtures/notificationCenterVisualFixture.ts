import { buildIntegrationEvent, buildTaskAttentionEvent, buildVacationEvent, buildWorkloadEvent } from "../test/notificationEventFactory";
import type { NotificationEvent } from "../platform/notificationTypes";

const now = Date.now();
const hours = (n: number) => new Date(now - n * 60 * 60 * 1000).toISOString();
const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

/** Realistic mixed history for visual regression and manual QA. */
export function notificationCenterVisualFixture(): NotificationEvent[] {
  return [
    buildTaskAttentionEvent({
      id: "visual-task-unread",
      createdAt: hours(0.2),
      message: "UX-5446 · Daria Chernowa · No activity for 7+ days",
    }),
    {
      id: "visual-jira-assignment",
      type: "jira_assignment",
      createdAt: hours(0.15),
      title: "UX-6124 assigned to you",
      message: "Sportsbook navigation",
      issueKey: "UX-6124",
      target: { kind: "jira", issueKey: "UX-6124" },
      severity: "warning",
      source: "jira",
      actionRequired: true,
      dedupeKey: "jira:assignment:UX-6124",
    },
    {
      id: "visual-bamboo-action",
      type: "bamboo_document_action",
      createdAt: hours(2),
      title: "Document requires signature",
      message: "Information Security Policy",
      target: { kind: "bamboo" },
      severity: "warning",
      source: "bamboo",
      actionRequired: true,
      dedupeKey: "bamboo:action:policy",
    },
    {
      id: "visual-feedback-action",
      type: "feedback_action",
      createdAt: hours(4),
      title: "Survey delivery failed",
      message: "2 delivery failures need attention",
      target: { kind: "feedback", tab: "delivery" },
      severity: "warning",
      source: "feedback",
      actionRequired: true,
      dedupeKey: "feedback:delivery-failures",
    },
    buildWorkloadEvent({
      id: "visual-workload-unread",
      createdAt: hours(1),
    }),
    buildVacationEvent("vacation_reminder", {
      id: "visual-vacation-unread",
      createdAt: hours(3),
      title: "Vacation in 3 days",
      message: "12–16 Oct",
    }),
    buildVacationEvent("vacation_return", {
      id: "visual-return-yesterday",
      createdAt: days(1.2),
      readAt: days(1),
      personName: "Nikita",
      message: "Nikita returns today",
    }),
    buildIntegrationEvent({
      id: "visual-integration-earlier",
      createdAt: days(3),
      readAt: days(2),
    }),
  ];
}

export function serializeNotificationFixtureForPlaywright(): string {
  return JSON.stringify(notificationCenterVisualFixture());
}
