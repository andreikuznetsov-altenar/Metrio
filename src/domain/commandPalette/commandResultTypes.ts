import type { ActionTarget } from "../actions/actionTypes";

export type CommandResultType =
  | "command"
  | "person"
  | "jira_issue"
  | "jira_project"
  | "confluence_page"
  | "resource"
  | "feedback";

export type CommandPaletteTarget =
  | { kind: "command"; commandId: string }
  | { kind: "person"; personId: string }
  | { kind: "jira"; issueKey: string; url?: string }
  | { kind: "jira_project"; projectKey: string; url?: string }
  | { kind: "confluence"; url: string; pageId?: string }
  | { kind: "resource"; target: ActionTarget }
  | { kind: "feedback"; tab: "survey" | "delivery" | "results" | "history" };

export interface CommandResult {
  id: string;
  type: CommandResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  section: string;
  score: number;
  target: CommandPaletteTarget;
}

export const COMMAND_SECTION_LABELS: Record<string, string> = {
  commands: "COMMANDS",
  people: "PEOPLE",
  jira: "JIRA",
  confluence: "CONFLUENCE",
  resources: "RESOURCES",
  feedback: "FEEDBACK",
  recents: "RECENTS",
};
