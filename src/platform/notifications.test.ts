import { describe, expect, it, vi, beforeEach } from "vitest";
import { processNotificationTransitions } from "./notifications";
import type { Person } from "../domain/people/types";
import { DEFAULT_PREFERENCES } from "./preferences";
import { testKpi, testWorkload } from "../domain/testFixtures";

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => "granted"),
  sendNotification: vi.fn(async () => undefined),
}));

import { sendNotification } from "@tauri-apps/plugin-notification";

function person(state: Person["availability"]["state"]): Person {
  return {
    id: "1",
    bamboo: {
      id: "1",
      displayName: "Sam",
      firstName: "Sam",
      lastName: "",
      workEmail: "sam@co.com",
      jobTitle: "Eng",
      status: "Active",
    },
    jira: {
      accountId: "j1",
      displayName: "Sam",
      email: "sam@co.com",
      canonicalKey: "j1",
    },
    identity: { matchedBy: "email", warnings: [] },
    availability: { state, label: state, isHoliday: false },
    workload: testWorkload({ level: "normal" }),
    performance: testKpi(),
    issues: [],
  };
}

describe("processNotificationTransitions", () => {
  beforeEach(() => {
    vi.mocked(sendNotification).mockClear();
  });

  it("does not repeat vacation notifications for the same state", async () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      notifications: { ...DEFAULT_PREFERENCES.notifications, vacationStarts: true },
    };
    const first = await processNotificationTransitions(
      [person("on_vacation")],
      prefs,
    );
    const second = await processNotificationTransitions(
      [person("on_vacation")],
      first,
    );
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(second.notificationState.vacationNotified["1"]).toBeTruthy();
  });

  it("sends vacation reminder once for upcoming time off", async () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        vacationReminder: true,
      },
    };
    await processNotificationTransitions([person("vacation_soon")], prefs);
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Upcoming time off" }),
    );
  });
});
