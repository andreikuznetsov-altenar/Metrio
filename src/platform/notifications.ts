import type { AppPreferences } from "./preferences";
import type { Person } from "../domain/people/types";
import type { ReportParams } from "../domain/jira/types";
import { classifyTaskHealth } from "../domain/task-health/taskHealthEngine";
import { taskHealthThresholdsFromRules } from "../domain/operationalRules/normalizeOperationalRules";
import { normalizeOperationalRules } from "../domain/operationalRules/normalizeOperationalRules";
import { getOperationalIssues } from "../domain/people/ownedIssues";
import {
  recordNotificationEvent,
  type RecordNotificationEventInput,
} from "./notificationEvents";
import type { NotificationEventType } from "./notificationTypes";
import {
  dispatchNativeNotification,
  type NativeNotificationDescriptor,
} from "./notificationNativeDispatch";

export interface NotificationTransitionDescriptor
  extends RecordNotificationEventInput {
  native?: NativeNotificationDescriptor;
  toggleKey?: keyof AppPreferences["notifications"];
}

function workloadTransition(
  person: Person,
  prevLevel: string | undefined,
  nextLevel: string,
): NotificationTransitionDescriptor | null {
  if (prevLevel === nextLevel) return null;
  if (nextLevel !== "high" && nextLevel !== "overloaded") return null;
  if (!prevLevel) return null;

  const title = "Workload changed";
  const message = `${person.bamboo.displayName} is ${nextLevel}`;
  return {
    type: "workload_change",
    title,
    message,
    personId: person.id,
    personName: person.bamboo.displayName,
    target: { kind: "person", personId: person.id },
    dedupeKey: `workload:${person.id}:${nextLevel}`,
    toggleKey: "workloadAlerts",
    native: { title, body: message },
  };
}

export function collectPersonNotificationTransitions(
  persons: Person[],
  prefs: AppPreferences,
  params?: ReportParams,
): { descriptors: NotificationTransitionDescriptor[]; nextState: AppPreferences["notificationState"] } {
  const state = {
    workloadLevels: { ...prefs.notificationState.workloadLevels },
    vacationNotified: { ...prefs.notificationState.vacationNotified },
    problematicCounts: { ...prefs.notificationState.problematicCounts },
    integrationHealth: {
      ...prefs.notificationState.integrationHealth,
    },
  };
  const descriptors: NotificationTransitionDescriptor[] = [];
  const rules = normalizeOperationalRules(prefs.operationalRules);
  const healthThresholds = taskHealthThresholdsFromRules(rules);

  for (const person of persons) {
    const key = person.id;
    const workloadLevel = person.workload?.level || "normal";
    const prevWorkload = state.workloadLevels[key];

    const workloadEvent = workloadTransition(person, prevWorkload, workloadLevel);
    if (workloadEvent) {
      descriptors.push(workloadEvent);
    }
    state.workloadLevels[key] = workloadLevel;

    const availKey = `${key}:${person.availability.state}`;

    if (person.availability.state === "on_vacation") {
      if (state.vacationNotified[key] !== availKey) {
        const title = "Vacation started";
        const message = `${person.bamboo.displayName} · ${person.availability.label}`;
        descriptors.push({
          type: "vacation_upcoming",
          title,
          message,
          personId: person.id,
          personName: person.bamboo.displayName,
          target: { kind: "person", personId: person.id },
          dedupeKey: `vacation-start:${availKey}`,
          toggleKey: "vacationStarts",
          native: { title, body: message },
        });
        state.vacationNotified[key] = availKey;
      }
    }

    if (person.availability.state === "returns_today") {
      if (state.vacationNotified[key] !== "returns_today") {
        const title = "Return from time off";
        const message = `${person.bamboo.displayName} returns today`;
        descriptors.push({
          type: "vacation_return",
          title,
          message,
          personId: person.id,
          personName: person.bamboo.displayName,
          target: { kind: "person", personId: person.id },
          dedupeKey: `returns:${key}:${person.availability.returnDate || "today"}`,
          toggleKey: "returns",
          native: { title, body: message },
        });
        state.vacationNotified[key] = "returns_today";
      }
    }

    if (
      person.availability.state === "vacation_soon" ||
      person.availability.state === "vacation_tomorrow"
    ) {
      if (state.vacationNotified[key] !== availKey) {
        const title = "Vacation starting soon";
        const message = `${person.bamboo.displayName} · ${person.availability.label}`;
        descriptors.push({
          type: "vacation_reminder",
          title,
          message,
          personId: person.id,
          personName: person.bamboo.displayName,
          target: { kind: "person", personId: person.id },
          dedupeKey: `vacation-reminder:${availKey}`,
          toggleKey: "vacationReminder",
          native: { title, body: message },
        });
        state.vacationNotified[key] = availKey;
      }
    }

    const problematic = person.workload?.problematicCount || 0;
    const prevProb = state.problematicCounts[key] || 0;
    if (problematic > prevProb) {
      const title = "Problematic tasks";
      const message = `${person.bamboo.displayName}: ${problematic} problematic task${problematic === 1 ? "" : "s"}`;
      descriptors.push({
        type: "task_attention",
        title,
        message,
        personId: person.id,
        personName: person.bamboo.displayName,
        target: { kind: "person", personId: person.id },
        dedupeKey: `problematic:${key}:${problematic}`,
        toggleKey: "problematicTaskAlerts",
        native: { title, body: message },
      });
    }
    state.problematicCounts[key] = problematic;

    if (params) {
      for (const issue of getOperationalIssues(person)) {
        const health = classifyTaskHealth({
          issue,
          params,
          thresholds: healthThresholds,
        });
        const issueStateKey = `${key}:${issue.issueKey}`;
        const prevHealth = state.workloadLevels[issueStateKey];
        if (prevHealth !== health.status && health.status === "problematic") {
          const title = "Task needs attention";
          const message = `${issue.issueKey} · ${person.bamboo.displayName}`;
          descriptors.push({
            type: "task_attention",
            title,
            message,
            personId: person.id,
            personName: person.bamboo.displayName,
            issueKey: issue.issueKey,
            target: { kind: "jira", issueKey: issue.issueKey },
            dedupeKey: `task-attention:${issueStateKey}:problematic`,
            toggleKey: "problematicTaskAlerts",
            native: {
              title,
              body: `${issue.issueKey} became problematic`,
            },
          });
        }
        state.workloadLevels[issueStateKey] = health.status;
      }
    }
  }

  return { descriptors, nextState: state };
}

export async function processNotificationTransitions(
  persons: Person[],
  prefs: AppPreferences,
  params?: ReportParams,
): Promise<AppPreferences> {
  const { descriptors, nextState } = collectPersonNotificationTransitions(
    persons,
    prefs,
    params,
  );

  for (const descriptor of descriptors) {
    recordNotificationEvent(descriptor);
    if (descriptor.native && descriptor.toggleKey && prefs.notifications[descriptor.toggleKey]) {
      await dispatchNativeNotification(descriptor.native);
    }
  }

  return { ...prefs, notificationState: nextState };
}

export function nativeToggleForType(
  type: NotificationEventType,
): keyof AppPreferences["notifications"] | null {
  switch (type) {
    case "workload_change":
      return "workloadAlerts";
    case "vacation_upcoming":
      return "vacationStarts";
    case "vacation_reminder":
      return "vacationReminder";
    case "vacation_return":
      return "returns";
    case "task_attention":
      return "problematicTaskAlerts";
    case "jira_assignment":
    case "jira_reassignment":
      return "jiraAssignmentAlerts";
    case "bamboo_document_action":
    case "bamboo_onboarding_action":
      return "bambooActionAlerts";
    case "feedback_action":
      return "feedbackActionAlerts";
    case "integration_problem":
      return "integrationProblemAlerts";
    default:
      return null;
  }
}
