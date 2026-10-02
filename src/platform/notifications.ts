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

async function ensurePermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const perm = await requestPermission();
    granted = perm === 'granted';
  }
  return granted;
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
      await sendNotification({
        title: 'Workload change',
        body: `${person.bamboo.displayName}: ${workloadLevel} workload`,
      });
    }
    state.workloadLevels[key] = workloadLevel;

    const availKey = `${key}:${person.availability.state}`;
    if (toggles.vacationStarts && person.availability.state === 'on_vacation') {
      if (state.vacationNotified[key] !== availKey) {
        await sendNotification({
          title: 'Team member on vacation',
          body: `${person.bamboo.displayName} · ${person.availability.label}`,
        });
        state.vacationNotified[key] = availKey;
      }
    }

    if (toggles.returns && person.availability.state === 'returns_today') {
      if (state.vacationNotified[key] !== 'returns_today') {
        await sendNotification({
          title: 'Team member returns',
          body: `${person.bamboo.displayName} returns today`,
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
        await sendNotification({
          title: 'Upcoming time off',
          body: `${person.bamboo.displayName} · ${person.availability.label}`,
        });
        state.vacationNotified[key] = availKey;
      }
    }

    const problematic = person.workload?.problematicCount || 0;
    const prevProb = state.problematicCounts[key] || 0;
    if (toggles.problematicTaskAlerts && problematic > prevProb) {
      await sendNotification({
        title: 'Problematic task',
        body: `${person.bamboo.displayName}: ${problematic} problematic task${problematic === 1 ? '' : 's'}`,
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
          await sendNotification({
            title: 'Task needs attention',
            body: `${issue.issueKey} became problematic`,
          });
        }
        state.workloadLevels[issueKey] = health.status;
      }
    }
  }

  return { ...prefs, notificationState: state };
}
