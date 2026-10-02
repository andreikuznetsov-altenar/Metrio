import { describe, expect, it, vi, beforeEach } from "vitest";
import { collectPersonNotificationTransitions, processNotificationTransitions } from "./notifications";
import type { Person } from "../domain/people/types";
import { DEFAULT_PREFERENCES } from "./preferences";
import { testKpi, testWorkload } from "../domain/testFixtures";
import { clearNotificationEventsForTests, listNotificationEvents } from "./notificationEvents";
import { dispatchNativeNotification } from "./notificationNativeDispatch";

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => "granted"),
  sendNotification: vi.fn(async () => undefined),
}));

vi.mock("./notificationNativeDispatch", () => ({
  dispatchNativeNotification: vi.fn(async () => true),
}));

function person(
  state: Person["availability"]["state"],
  workload: Person["workload"]["level"] = "normal",
  prevLevel?: string,
): { person: Person; prefs: typeof DEFAULT_PREFERENCES } {
  const base = personEntity(state, workload);
  const prefs = {
    ...DEFAULT_PREFERENCES,
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      workloadAlerts: true,
      vacationStarts: true,
      vacationReminder: true,
      returns: true,
      problematicTaskAlerts: true,
    },
    notificationState: {
      ...DEFAULT_PREFERENCES.notificationState,
      workloadLevels: prevLevel ? { [base.id]: prevLevel } : {},
    },
  };
  return { person: base, prefs };
}

function personEntity(
  state: Person["availability"]["state"],
  workload: Person["workload"]["level"],
): Person {
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
    workload: testWorkload({ level: workload }),
    performance: testKpi(),
    issues: [],
  };
}

describe("notification transitions", () => {
  beforeEach(() => {
    clearNotificationEventsForTests();
    vi.mocked(dispatchNativeNotification).mockClear();
  });

  it("does not repeat vacation notifications for the same state", async () => {
    const { person: p, prefs } = person("on_vacation");
    const first = await processNotificationTransitions([p], prefs);
    const second = await processNotificationTransitions([p], first);
    expect(listNotificationEvents()).toHaveLength(1);
    expect(second.notificationState.vacationNotified["1"]).toBeTruthy();
  });

  it("does not create duplicate workload events on refresh while still overloaded", async () => {
    const { person: p, prefs } = person("available", "overloaded", "normal");
    const afterFirst = await processNotificationTransitions([p], prefs);
    await processNotificationTransitions([p], afterFirst);
    expect(listNotificationEvents()).toHaveLength(1);
  });

  it("records in-app event when native dispatch is unavailable", async () => {
    vi.mocked(dispatchNativeNotification).mockResolvedValueOnce(false);
    const { person: p, prefs } = person("vacation_soon");
    await processNotificationTransitions([p], {
      ...prefs,
      notifications: { ...prefs.notifications, vacationReminder: true },
    });
    expect(listNotificationEvents()).toHaveLength(1);
  });

  it("skips native alert when macOS toggle is disabled but still records in-app", async () => {
    const { person: p, prefs } = person("vacation_soon");
    await processNotificationTransitions([p], {
      ...prefs,
      notifications: { ...prefs.notifications, vacationReminder: false },
    });
    expect(listNotificationEvents()).toHaveLength(1);
    expect(dispatchNativeNotification).not.toHaveBeenCalled();
  });

  it("collects workload transition descriptors only on level change", () => {
    const { person: p, prefs } = person("available", "high", "normal");
    const { descriptors } = collectPersonNotificationTransitions([p], prefs);
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]?.type).toBe("workload_change");
  });
});
