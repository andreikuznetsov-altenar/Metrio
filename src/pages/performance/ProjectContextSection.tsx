import { useMemo } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { JiraIssueLink } from "../../components/JiraIssueLink/JiraIssueLink";
import { MetrioTableWrap } from "../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { deliveryStatusBadgeVariant } from "../../domain/performance/performanceStatusBadges";
import { useWorkGraph } from "../../app/WorkGraphContext";
import { confidenceLabel } from "../../domain/workGraph/workGraphTypes";
import { openExternalUrl } from "../../platform/openExternal";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import {
  buildConfluenceSpaceUrl,
  buildJiraProjectBrowseUrl,
} from "../../platform/atlassianUrls";
import { openProjectCockpit } from "../../platform/projectCockpitNavigation";
import { KnowledgeContextRow } from "./KnowledgeContextRow";
import type { KnowledgeContextItem } from "../../domain/knowledge/knowledgeMatching";
import type { WorkProjectIssue } from "../../domain/workGraph/workGraphTypes";

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

const PROJECT_TASK_COLUMNS = [
  { id: "issue", type: "text" as const },
  { id: "description", type: "text" as const },
  { id: "status", type: "text" as const },
];

function ProjectTasksTable({ issues }: { issues: WorkProjectIssue[] }) {
  const getValue = useMemo(
    () => (row: WorkProjectIssue, columnId: string) => {
      switch (columnId) {
        case "issue":
          return row.issueKey;
        case "description":
          return row.title;
        case "status":
          return row.status;
        default:
          return "";
      }
    },
    [],
  );
  const { sortedRows, sort, toggleSort } = useTableSort(issues, PROJECT_TASK_COLUMNS, getValue);

  return (
    <MetrioTableWrap testId="project-context-tasks">
      <table className="performance-table performance-table--interactive performance-table--project-tasks">
        <colgroup>
          <col className="col-issue" />
          <col className="col-description" />
          <col className="col-badge" />
        </colgroup>
        <thead>
          <tr>
            <SortableTableHeader columnId="issue" label="Issue" sort={sort} onToggle={toggleSort} />
            <SortableTableHeader
              columnId="description"
              label="Description"
              sort={sort}
              onToggle={toggleSort}
            />
            <SortableTableHeader columnId="status" label="Status" sort={sort} onToggle={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.issueKey}>
              <td className="performance-delivery-risk__key">
                <JiraIssueLink issueKey={row.issueKey} />
              </td>
              <td className="performance-table__cell--clamp-2" title={row.title}>
                <span className="performance-table__clamp">{row.title}</span>
              </td>
              <td>
                {row.status ? (
                  <Badge variant={deliveryStatusBadgeVariant(row.status)}>{row.status}</Badge>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </MetrioTableWrap>
  );
}

export function ProjectContextSection() {
  const graph = useWorkGraph();
  const project = graph.projects[0];

  if (graph.status === "unavailable") {
    return (
      <p
        className="performance-inline-empty performance-inline-empty--surface"
        data-testid="knowledge-unavailable"
      >
        Knowledge unavailable
      </p>
    );
  }

  if (graph.status !== "ready" || !project) {
    return null;
  }

  const docs = graph.knowledgeByProject.get(project.key) ?? [];

  return (
    <section className="project-context performance-section executive-panel" data-testid="project-context" aria-label="Project context">
      <h3 className="executive-panel__title">{project.key}</h3>
      <p className="performance-employee-context">
        {project.activeTaskCount} active tasks
        {docs.length ? ` · ${docs.length} relevant docs` : ""}
      </p>
      {project.activeIssues && project.activeIssues.length > 0 ? (
        <ProjectTasksTable issues={project.activeIssues} />
      ) : null}
      {docs.length > 0 ? (
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
      ) : null}
      <div className="project-context__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => openProjectCockpit(project.key)}
        >
          Project cockpit
        </Button>
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
