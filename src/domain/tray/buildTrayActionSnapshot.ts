import type { TrayActionSnapshot } from "./trayActionSnapshot";
import {
  unreadJiraAssignments,
  type JiraAssignmentState,
} from "../jira/jiraAssignmentTracking";

export function buildTrayActionSnapshot(input: {
  assignmentState: JiraAssignmentState;
  activeTaskCount: number;
  bambooActions: TrayActionSnapshot["bambooActions"];
  upcomingVacation?: TrayActionSnapshot["upcomingVacation"];
  nextOneOnOne?: TrayActionSnapshot["nextOneOnOne"];
}): TrayActionSnapshot {
  const unread = unreadJiraAssignments(input.assignmentState);
  const count = unread.length;
  return {
    trayTitle: count > 0 ? String(count) : undefined,
    unreadAssignmentCount: count,
    newTasks: unread.map((record) => ({
      issueKey: record.issueKey,
      title: record.title,
    })),
    activeTaskCount: input.activeTaskCount,
    bambooActions: input.bambooActions,
    upcomingVacation: input.upcomingVacation,
    nextOneOnOne: input.nextOneOnOne,
  };
}
