import type { GroupedAttentionSignal } from "../../pages/performance/groupAttentionSignals";
import type { PersonBriefModel } from "./personBriefTypes";

export interface PersonBriefPrompt {
  id: string;
  fact: string;
  prompt: string;
}

export function buildPersonBriefPrompts(brief: PersonBriefModel): PersonBriefPrompt[] {
  const prompts: PersonBriefPrompt[] = [];

  for (const group of brief.attention) {
    const keys = group.issueKeys.slice(0, 2).join(", ");
    const fact = keys
      ? `${group.taskCount} task${group.taskCount === 1 ? "" : "s"} · ${group.reason}${keys ? ` (${keys})` : ""}`
      : `${group.taskCount} task${group.taskCount === 1 ? "" : "s"} · ${group.reason}`;
    prompts.push({
      id: `attention-${group.label}-${group.reason}`,
      fact,
      prompt: attentionPromptFor(group),
    });
  }

  if (brief.timeOff?.activeWorkCount && brief.timeOff.activeWorkCount > 0) {
    prompts.push({
      id: "leave-active-work",
      fact: `${brief.timeOff.headline} with ${brief.timeOff.activeWorkCount} active tasks`,
      prompt:
        "Is there anything in the current work that needs coverage before leave?",
    });
  }

  if (brief.backflows.count > 0 && brief.backflows.issueKeys.length > 0) {
    const key = brief.backflows.issueKeys[0];
    prompts.push({
      id: `backflow-${key}`,
      fact: `${brief.backflows.count} backflow${brief.backflows.count === 1 ? "" : "s"} in period`,
      prompt: `What happened with ${key} after it moved backward in the workflow?`,
    });
  }

  if (brief.newStarter) {
    prompts.push(
      {
        id: "onboarding-going",
        fact: brief.newStarter.headline,
        prompt: "How is onboarding going so far?",
      },
      {
        id: "onboarding-resources",
        fact: "Team resources are available in Metrio",
        prompt: "Are the team resources easy to find?",
      },
      {
        id: "onboarding-tools",
        fact: "Tool access is part of onboarding",
        prompt: "Is anything blocking access to the tools you need?",
      },
    );
  }

  return prompts.slice(0, 8);
}

function attentionPromptFor(group: GroupedAttentionSignal): string {
  if (/review/i.test(group.reason) || /review/i.test(group.label)) {
    return "Is anything blocking this review?";
  }
  if (/no activity|stale|inactive/i.test(group.reason)) {
    return "Is there a blocker or dependency on this work?";
  }
  return "Is there anything you need to move this work forward?";
}
