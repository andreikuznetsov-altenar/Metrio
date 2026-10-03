import type { HomeKnowledgeItem, HomeWorkspace } from "../domain/home/homeTypes";

/** Visual-test-only Home states (VITE_VISUAL_FIXTURE=1). */
export type HomeVisualState = "blocked" | "partial" | null;

export function readHomeVisualState(): HomeVisualState {
  if (import.meta.env.VITE_VISUAL_FIXTURE !== "1") return null;
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("visualHomeState");
  if (value === "blocked" || value === "partial") return value;
  return null;
}

const VISUAL_HOME_KNOWLEDGE: HomeKnowledgeItem[] = [
  {
    id: "visual-handbook",
    title: "UX Team Handbook",
    url: "https://confluence.visual.metrio/wiki/spaces/UX/pages/100",
    contextLabel: "Confluence · UX",
  },
  {
    id: "visual-issue-doc",
    title: "UX-6124 documentation",
    url: "https://confluence.visual.metrio/wiki/spaces/UX/pages/6124",
    contextLabel: "Related to current work",
    relatedIssueKey: "UX-6124",
  },
];

export function applyVisualHomeOverrides(workspace: HomeWorkspace): HomeWorkspace {
  if (import.meta.env.VITE_VISUAL_FIXTURE !== "1" || typeof window === "undefined") {
    return workspace;
  }
  if (new URLSearchParams(window.location.search).get("visualHomeKnowledge") !== "1") {
    return workspace;
  }
  return {
    ...workspace,
    personal: {
      ...workspace.personal,
      knowledge: VISUAL_HOME_KNOWLEDGE,
      knowledgeStatus: "ready",
    },
  };
}
