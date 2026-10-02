import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { AppPreferences } from './preferences';
import type { Person } from '../domain/people/types';
import type { ReportParams } from '../domain/jira/types';
import { classifyTaskHealth } from '../domain/task-health/taskHealthEngine';
import { getOperationalIssues } from '../domain/people/ownedIssues';
import { recordNotificationEvent } from './notificationEvents';

async function ensurePermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const perm = await requestPermission();
    granted = perm === 'granted';
  }
  return granted;
}

function recordInAppEvent(
  input: Parameters<typeof recordNotificationEvent>[0],
): void {
  recordNotificationEvent(input);
}

export async function processNotificationTransitions(
  persons: Person[],
  prefs: AppPreferences,
  params?: ReportParams,
  onNavigate?: (path: string) => void,
): Promise<AppPreferences> {
  if (!(await ensurePermission())) return prefs;

  const state = { ...prefs.notificationState };
  const toggles = prefs.notifications;

  for (const person of persons) {
    const key = person.id;
    const workloadLevel = person.workload?.level || 'normal';
    const prevWorkload = state.workloadLevels[key];

    if (
      toggles.workloadAlerts &&
      prevWorkload &&
      prevWorkload !== workloadLevel &&
      (workloadLevel === 'high' || workloadLevel === 'overloaded')
    ) {
      const title = 'Workload change';
      const body = `${person.bamboo.displayName}: ${workloadLevel} workload`;
      await sendNotification({ title, body });
      recordInAppEvent({
        type: 'workload_change',
        title,
        message: body,
        personId: person.id,
        navigationTarget: `person:${person.id}`,
        dedupeKey: `workload:${key}:${workloadLevel}`,
      });
    }
    state.workloadLevels[key] = workloadLevel;

    const availKey = `${key}:${person.availability.state}`;
    if (toggles.vacationStarts && person.availability.state === 'on_vacation') {
      if (state.vacationNotified[key] !== availKey) {
        const title = 'Team member on vacation';
        const body = `${person.bamboo.displayName} · ${person.availability.label}`;
        await sendNotification({ title, body });
        recordInAppEvent({
          type: 'upcoming_time_off',
          title,
          message: body,
          personId: person.id,
          dedupeKey: `vacation-start:${availKey}`,
        });
        state.vacationNotified[key] = availKey;
      }
    }

    if (toggles.returns && person.availability.state === 'returns_today') {
      if (state.vacationNotified[key] !== 'returns_today') {
        const title = 'Team member returns';
        const body = `${person.bamboo.displayName} returns today`;
        await sendNotification({ title, body });
        recordInAppEvent({
          type: 'returns',
          title,
          message: body,
          personId: person.id,
          dedupeKey: `returns:${key}:${person.availability.returnDate || 'today'}`,
        });
        state.vacationNotified[key] = 'returns_today';
      }
    }

    if (
      toggles.vacationReminder &&
      (person.availability.state === 'vacation_soon' ||
        person.availability.state === 'vacation_tomorrow')
    ) {
      if (state.vacationNotified[key] !== availKey) {
        const title = 'Upcoming time off';
        const body = `${person.bamboo.displayName} · ${person.availability.label}`;
        await sendNotification({ title, body });
        recordInAppEvent({
          type: 'upcoming_time_off',
          title,
          message: body,
          personId: person.id,
          dedupeKey: `vacation-reminder:${availKey}`,
        });
        state.vacationNotified[key] = availKey;
      }
    }

    const problematic = person.workload?.problematicCount || 0;
    const prevProb = state.problematicCounts[key] || 0;
    if (toggles.problematicTaskAlerts && problematic > prevProb) {
      const title = 'Problematic task';
      const body = `${person.bamboo.displayName}: ${problematic} problematic task${problematic === 1 ? '' : 's'}`;
      await sendNotification({ title, body });
      recordInAppEvent({
        type: 'problematic_task',
        title,
        message: body,
        personId: person.id,
        navigationTarget: `person:${person.id}`,
        dedupeKey: `problematic:${key}:${problematic}`,
      });
      onNavigate?.(`/person/${encodeURIComponent(person.jira?.canonicalKey || person.bamboo.workEmail)}`);
    }
    state.problematicCounts[key] = problematic;

    if (params && toggles.problematicTaskAlerts) {
      for (const issue of getOperationalIssues(person)) {
        const health = classifyTaskHealth({ issue, params });
        const issueKey = `${key}:${issue.issueKey}`;
        const prevHealth = state.workloadLevels[issueKey];
        if (prevHealth !== health.status && health.status === 'problematic') {
          const title = 'Task needs attention';
          const body = `${issue.issueKey} became problematic`;
          await sendNotification({ title, body });
          recordInAppEvent({
            type: 'task_attention',
            title,
            message: `${issue.issueKey} · ${person.bamboo.displayName}`,
            personId: person.id,
            issueKey: issue.issueKey,
            navigationTarget: `person:${person.id}`,
            dedupeKey: `task-attention:${issueKey}:problematic`,
          });
        }
        state.workloadLevels[issueKey] = health.status;
      }
    }
  }

  return { ...prefs, notificationState: state };
}
