import type { GoalsDataFile } from "../domain/goals/goalTypes";
import { GOALS_DATA_SCHEMA_VERSION } from "../domain/goals/goalTypes";

export function serializeGoalsVisualFixtureForPlaywright(): string {
  const data: GoalsDataFile = {
    schemaVersion: GOALS_DATA_SCHEMA_VERSION,
    goals: [
      {
        id: "goal_visual_employee",
        title: "Improve UX delivery workflow",
        ownerPersonId: "person-alex",
        scope: "person",
        status: "active",
        reviewDate: "2026-11-30",
        progressMode: "linked_work",
        linkedJiraIssueKeys: ["UX-6124", "UX-6188"],
        linkedJiraProjectKeys: [],
        linkedConfluencePageIds: [],
        employeeMayEditManualProgress: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "goal_visual_team",
        title: "Reduce long Review work",
        ownerPersonId: "person-sam",
        scope: "team",
        status: "active",
        progressMode: "linked_issue_count",
        linkedJiraIssueKeys: ["MET-1", "MET-2", "MET-3"],
        linkedJiraProjectKeys: [],
        linkedConfluencePageIds: [],
        employeeMayEditManualProgress: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    history: [],
  };
  return JSON.stringify(data);
}
