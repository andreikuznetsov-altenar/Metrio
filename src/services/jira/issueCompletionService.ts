import { buildIssueEvents } from "../../domain/jira/events";
import {
  parseJiraTransitions,
  selectCompletionOptions,
  type CompletionOption,
} from "../../domain/jira/issueCompletion";
import type { VerifiedIssueState } from "../../domain/jira/applyVerifiedIssueState";
import type { AuditIssue } from "../../domain/jira/types";
import { getDocFixtureMode } from "../../platform/docFixtures";
import { getWorkEmail, loadPreferences } from "../../platform/preferences";
import { resolveJiraBaseUrl } from "../../config/product";
import { JiraClient } from "./jiraClient";

import { appNow } from "../../platform/appClock";
export type IssueCompletionFailure = "stale_refresh" | "rejected";

export class IssueCompletionError extends Error {
  constructor(
    readonly kind: IssueCompletionFailure,
    message: string,
  ) {
    super(message);
  }
}

export interface IssueCompletionService {
  /** Jira-reported, workflow-mapped, executable terminal-success transitions. */
  fetchOptions(issue: AuditIssue): Promise<CompletionOption[]>;
  /**
   * Executes the exact transition, waits for Jira, re-fetches the exact issue and returns the
   * verified state. Throws IssueCompletionError; never mutates local state itself.
   */
  complete(issue: AuditIssue, option: CompletionOption): Promise<VerifiedIssueState>;
}

interface JiraLike {
  fetchIssueTransitions(issueKey: string): Promise<unknown>;
  transitionIssue(issueKey: string, transitionId: string): Promise<void>;
  fetchIssueByKey(issueKey: string): Promise<unknown>;
  fetchAllChangelog(issueKey: string): Promise<unknown[]>;
}

export function createJiraIssueCompletionService(client: JiraLike): IssueCompletionService {
  return {
    async fetchOptions(issue) {
      const raw = await client.fetchIssueTransitions(issue.issueKey);
      return selectCompletionOptions(issue, parseJiraTransitions(raw));
    },
    async complete(issue, option) {
      try {
        await client.transitionIssue(issue.issueKey, option.transitionId);
      } catch (error) {
        throw new IssueCompletionError(
          "rejected",
          error instanceof Error ? error.message : "Jira rejected the transition.",
        );
      }
      try {
        const fresh = (await client.fetchIssueByKey(issue.issueKey)) as {
          fields?: { status?: { name?: string } };
        };
        const currentStatus = fresh?.fields?.status?.name;
        if (!currentStatus) throw new Error("Jira did not return the issue status.");
        const changelog = await client.fetchAllChangelog(issue.issueKey);
        const statusEvents = buildIssueEvents(changelog as never[]).filter(
          (event) => event.eventType === "Status",
        );
        return { issueKey: issue.issueKey, currentStatus, statusEvents };
      } catch (error) {
        throw new IssueCompletionError(
          "stale_refresh",
          error instanceof Error ? error.message : "Could not re-read the issue from Jira.",
        );
      }
    },
  };
}

/**
 * Fixture / documentation / visual-test builds never reach Jira: transitions are answered by an
 * in-memory mock and no write command is ever invoked.
 */
export function createFixtureIssueCompletionService(): IssueCompletionService {
  const failing = () => {
    try {
      return localStorage.getItem("metrio-visual-completionFail") === "1";
    } catch {
      return false;
    }
  };
  return {
    async fetchOptions(issue) {
      const raw = {
        transitions: [
          { id: "41", name: "Approve", to: { name: "Done" } },
          { id: "42", name: "Cancel", to: { name: "Cancelled" } },
          {
            id: "43",
            name: "Close with resolution",
            to: { name: "Closed" },
            fields: { resolution: { required: true, hasDefaultValue: false } },
          },
        ],
      };
      return selectCompletionOptions(issue, parseJiraTransitions(raw));
    },
    async complete(issue, option) {
      if (failing()) throw new IssueCompletionError("rejected", "Mock Jira rejected the transition.");
      return {
        issueKey: issue.issueKey,
        currentStatus: option.targetStatus,
        statusEvents: [
          {
            eventType: "Status",
            changedAt: appNow().toISOString(),
            changedBy: "Metrio fixture",
            fromValue: issue.currentStatus ?? "",
            toValue: option.targetStatus,
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      };
    },
  };
}

export async function getIssueCompletionService(): Promise<IssueCompletionService> {
  const doc = await getDocFixtureMode().catch(() => ({ enabled: false }));
  if (doc.enabled || import.meta.env.VITE_VISUAL_FIXTURE === "1") {
    return createFixtureIssueCompletionService();
  }
  const prefs = await loadPreferences();
  return createJiraIssueCompletionService(
    new JiraClient({ baseUrl: resolveJiraBaseUrl(prefs), email: getWorkEmail(prefs) }),
  );
}
