import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_JIRA_ASSIGNMENT_STATE,
  type JiraAssignmentState,
} from "../domain/jira/jiraAssignmentTracking";
import { readJiraAssignmentState } from "../platform/jiraAssignmentNotifications";
import { loadPreferences } from "../platform/preferences";

import { JIRA_ASSIGNMENT_CHANGED } from "../platform/jiraAssignmentEvents";

export function useJiraAssignmentState(
  refreshKey?: string | null,
): JiraAssignmentState {
  const [state, setState] = useState<JiraAssignmentState>(
    EMPTY_JIRA_ASSIGNMENT_STATE,
  );

  const reload = useCallback(async () => {
    const prefs = await loadPreferences();
    setState(readJiraAssignmentState(prefs));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  useEffect(() => {
    const onChanged = () => void reload();
    window.addEventListener(JIRA_ASSIGNMENT_CHANGED, onChanged);
    return () => window.removeEventListener(JIRA_ASSIGNMENT_CHANGED, onChanged);
  }, [reload]);

  return state;
}
