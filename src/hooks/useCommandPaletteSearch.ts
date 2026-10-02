import { useEffect, useMemo, useRef, useState } from "react";
import { resolveJiraBaseUrl } from "../config/product";
import {
  collectKnowledgePages,
  searchLocalCommandPalette,
} from "../domain/commandPalette/localCommandSearch";
import type { CommandResult } from "../domain/commandPalette/commandResultTypes";
import { looksLikeIssueKey } from "../domain/commandPalette/issueKeyPattern";
import { canOpenPersonDetail } from "../domain/personAccess";
import type { Person } from "../domain/people/types";
import type { CurrentUser } from "../domain/types";
import { getWorkEmail, loadPreferences } from "../platform/preferences";
import { listCommandPaletteRecents } from "../platform/commandPaletteRecents";
import { JiraClient } from "../services/jira/jiraClient";
import {
  REMOTE_SEARCH_MIN_LENGTH,
  searchRemoteCommandPalette,
} from "../services/commandPalette/remoteCommandSearch";
import type { WorkGraphState } from "../app/WorkGraphContext";

const REMOTE_DEBOUNCE_MS = 320;

export interface UseCommandPaletteSearchInput {
  open: boolean;
  query: string;
  currentUser: CurrentUser;
  teamPersons: Person[];
  workGraph: WorkGraphState;
  feedbackEnabled: boolean;
}

export function useCommandPaletteSearch({
  open,
  query,
  currentUser,
  teamPersons,
  workGraph,
  feedbackEnabled,
}: UseCommandPaletteSearchInput) {
  const [remoteResults, setRemoteResults] = useState<CommandResult[]>([]);
  const [remoteHint, setRemoteHint] = useState<string | null>(null);
  const remoteSeq = useRef(0);
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, [open]);

  const authorizedPeople = useMemo(
    () =>
      teamPersons.filter((person) =>
        canOpenPersonDetail(currentUser, person.id),
      ),
    [teamPersons, currentUser],
  );

  const knowledgePages = useMemo(
    () =>
      collectKnowledgePages(
        workGraph.knowledgeByIssue,
        workGraph.knowledgeByProject,
      ),
    [workGraph.knowledgeByIssue, workGraph.knowledgeByProject],
  );

  const localResults = useMemo(() => {
    if (!open) return [];
    return searchLocalCommandPalette({
      query,
      people: authorizedPeople,
      projects: workGraph.projects,
      knowledgePages,
      recents: listCommandPaletteRecents(),
      feedbackEnabled,
      jiraBaseUrl,
    });
  }, [
    open,
    query,
    authorizedPeople,
    workGraph.projects,
    knowledgePages,
    feedbackEnabled,
    jiraBaseUrl,
  ]);

  const localConfluenceCount = localResults.filter(
    (result) => result.type === "confluence_page",
  ).length;

  useEffect(() => {
    if (!open) {
      setRemoteResults([]);
      setRemoteHint(null);
      remoteSeq.current += 1;
      return;
    }

    const trimmed = query.trim();
    const hasCachedExactIssue =
      looksLikeIssueKey(trimmed) &&
      localResults.some(
        (result) =>
          result.type === "jira_issue" &&
          result.score >= 1000 &&
          result.target.kind === "jira",
      );
    const needsRemote =
      (looksLikeIssueKey(trimmed) && !hasCachedExactIssue) ||
      (trimmed.length >= REMOTE_SEARCH_MIN_LENGTH && !looksLikeIssueKey(trimmed));

    if (!needsRemote) {
      setRemoteResults([]);
      setRemoteHint(null);
      remoteSeq.current += 1;
      return;
    }

    const seq = ++remoteSeq.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const prefs = await loadPreferences();
          const email = getWorkEmail(prefs);
          const baseUrl = resolveJiraBaseUrl(prefs);
          const jira = new JiraClient({ baseUrl, email });
          const knownIssueKeys = new Set(
            localResults
              .filter((result) => result.type === "jira_issue")
              .map((result) =>
                result.target.kind === "jira" ? result.target.issueKey : "",
              )
              .filter(Boolean),
          );
          const remote = await searchRemoteCommandPalette({
            query: trimmed,
            jira,
            confluenceConfig: { baseUrl, email },
            knownIssueKeys,
            localConfluenceCount,
          });
          if (seq !== remoteSeq.current) return;
          setRemoteResults(remote.results);
          if (remote.jiraFailed && remote.confluenceFailed) {
            setRemoteHint("Some remote sources are unavailable");
          } else if (remote.confluenceFailed) {
            setRemoteHint("Confluence search unavailable");
          } else if (remote.jiraFailed) {
            setRemoteHint("Jira search unavailable");
          } else {
            setRemoteHint(null);
          }
        } catch {
          if (seq !== remoteSeq.current) return;
          setRemoteResults([]);
          setRemoteHint("Remote search unavailable");
        }
      })();
    }, REMOTE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [open, query, localResults, localConfluenceCount]);

  const results = useMemo(() => {
    const merged = new Map<string, CommandResult>();
    for (const result of [...localResults, ...remoteResults]) {
      const existing = merged.get(result.id);
      if (!existing || result.score > existing.score) {
        merged.set(result.id, result);
      }
    }
    return [...merged.values()].sort((a, b) => b.score - a.score);
  }, [localResults, remoteResults]);

  return { results, remoteHint };
}
