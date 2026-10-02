import { describe, expect, it, beforeEach, vi } from "vitest";
import { processIntegrationNotificationTransitions } from "./integrationNotificationTransitions";
import { DEFAULT_PREFERENCES } from "./preferences";
import { clearNotificationEventsForTests, listNotificationEvents } from "./notificationEvents";

vi.mock("./notificationNativeDispatch", () => ({
  dispatchNativeNotification: vi.fn(async () => true),
}));

describe("integrationNotificationTransitions", () => {
  beforeEach(() => {
    clearNotificationEventsForTests();
  });

  it("creates integration_problem on healthy to unhealthy transition", () => {
    const next = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
      bambooStale: false,
    });
    expect(listNotificationEvents()).toHaveLength(1);
    expect(listNotificationEvents()[0]?.type).toBe("integration_problem");
    expect(next.notificationState.integrationHealth?.jira).toBe("unhealthy");
  });

  it("does not repeat unhealthy events without recovery", () => {
    const once = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    processIntegrationNotificationTransitions(once, { jiraStale: true });
    expect(listNotificationEvents()).toHaveLength(1);
  });

  it("creates restored event after unhealthy to healthy transition", () => {
    const unhealthy = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    processIntegrationNotificationTransitions(unhealthy, { jiraStale: false });
    expect(listNotificationEvents()).toHaveLength(2);
    expect(listNotificationEvents()[0]?.title).toBe("Connection restored");
  });
});
