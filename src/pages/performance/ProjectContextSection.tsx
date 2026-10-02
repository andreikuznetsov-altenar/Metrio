import { Button } from "../../components/Button/Button";
import { useWorkGraph } from "../../app/WorkGraphContext";
import { confidenceLabel } from "../../domain/workGraph/workGraphTypes";
import { openExternalUrl } from "../../platform/openExternal";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import {
  buildConfluenceSpaceUrl,
  buildJiraProjectBrowseUrl,
} from "../../platform/atlassianUrls";
import { KnowledgeContextRow } from "./KnowledgeContextRow";
import type { KnowledgeContextItem } from "../../domain/knowledge/knowledgeMatching";

function toContextItem(
  link: import("../../domain/workGraph/workGraphTypes").WorkKnowledgeLink,
): KnowledgeContextItem {
  return {
    page: {
      id: link.page.id,
      title: link.page.title,
      spaceKey: link.page.spaceKey,
      spaceName: link.page.spaceName,
      url: link.page.url,
      updatedAt: link.page.updatedAt,
      excerpt: link.page.excerpt,
    },
    confidence: link.confidence === "contextual_search" ? "suggested" : "related",
    relatedIssueKey: link.issueKey,
  };
}

export function ProjectContextSection() {
  const graph = useWorkGraph();
  const project = graph.projects[0];

  if (graph.status === "unavailable") {
    return (
      <p className="performance-inline-empty" data-testid="knowledge-unavailable">
        Knowledge unavailable
      </p>
    );
  }

  if (graph.status !== "ready" || !project) {
    return null;
  }

  const docs = graph.knowledgeByProject.get(project.key) ?? [];

  return (
    <section className="project-context" data-testid="project-context" aria-label="Project context">
      <h3 className="performance-section__title">{project.key}</h3>
      <p className="performance-employee-context">
        {project.activeTaskCount} active tasks
        {docs.length ? ` · ${docs.length} relevant docs` : ""}
      </p>
      <ul className="project-context__docs">
        {docs.slice(0, 3).map((link) => (
          <li key={link.id}>
            <KnowledgeContextRow
              item={toContextItem(link)}
              onOpen={(url) => void openExternalUrl(url)}
            />
            <span className="performance-inline-empty">
              {confidenceLabel(link.confidence)}
            </span>
          </li>
        ))}
      </ul>
      <div className="project-context__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void (async () => {
              const prefs = await loadPreferences();
              const url = buildJiraProjectBrowseUrl(
                resolveJiraBaseUrl(prefs),
                project.key,
              );
              await openExternalUrl(url);
            })();
          }}
        >
          Open Jira
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void (async () => {
              const prefs = await loadPreferences();
              const base = resolveJiraBaseUrl(prefs);
              const space = project.linkedSpaceKey ?? project.key;
              await openExternalUrl(buildConfluenceSpaceUrl(base, space));
            })();
          }}
        >
          Open Confluence
        </Button>
      </div>
    </section>
  );
}
