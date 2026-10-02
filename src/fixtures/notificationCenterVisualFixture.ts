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
    buildWorkloadEvent({
      id: "visual-workload-unread",
      createdAt: hours(1),
    }),
    buildVacationEvent("vacation_upcoming", {
      id: "visual-vacation-read",
      createdAt: hours(3),
      readAt: hours(2),
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
