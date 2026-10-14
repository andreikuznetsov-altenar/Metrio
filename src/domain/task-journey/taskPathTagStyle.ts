import type { BadgeVariant } from "../../components/Badge/Badge";
import type { AuditIssue } from "../jira/types";
import { resolveWorkflowProfile } from "../workflows/resolveWorkflowProfile";
import { resolveWorkflowStage } from "../workflows/resolveWorkflowStage";
import type { CanonicalStage } from "../workflows/types";

export interface TaskPathTagStyle {
  variant: BadgeVariant;
  /** Softer treatment for on-hold / waiting stages (muted amber). */
  muted: boolean;
}

const STAGE_STYLE: Record<CanonicalStage, TaskPathTagStyle> = {
  unknown: { variant: "neutral", muted: false },
  backlog: { variant: "neutral", muted: false },
  active: { variant: "info", muted: false },
  review: { variant: "warning", muted: false },
  qa: { variant: "accent", muted: false },
  waiting: { variant: "warning", muted: true },
  hold: { variant: "warning", muted: true },
  done: { variant: "success", muted: false },
  cancelled: { variant: "neutral", muted: true },
};

/**
 * Tag colour for one raw status of an issue, from the workflow-aware canonical stage (so every
 * occurrence of the same status gets the same colour, and workflows that finish as Approved /
 * Closed / Done are all green).
 */
export function taskPathTagStyle(issue: AuditIssue, status: string): TaskPathTagStyle {
  const stage = resolveWorkflowStage(resolveWorkflowProfile(issue), status).canonicalStage;
  return STAGE_STYLE[stage] ?? STAGE_STYLE.unknown;
}
