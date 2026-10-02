import type { WorkKnowledgeLink } from "../workGraph/workGraphTypes";

export function collectHomeKnowledgeLinks(
  knowledgeByIssue: Map<string, WorkKnowledgeLink[]>,
  knowledgeByProject: Map<string, WorkKnowledgeLink[]>,
): WorkKnowledgeLink[] {
  const out: WorkKnowledgeLink[] = [];
  for (const links of knowledgeByIssue.values()) {
    out.push(...links);
  }
  for (const links of knowledgeByProject.values()) {
    out.push(...links);
  }
  return out;
}
