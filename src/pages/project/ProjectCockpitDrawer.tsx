import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useOperationalRules } from "../../app/OperationalRulesContext";
import { useWorkGraph } from "../../app/WorkGraphContext";
import { filterProjectWorkRows } from "../../domain/projectCockpit/buildProjectCockpit";
import type { ProjectWorkFilter } from "../../domain/projectCockpit/projectCockpitTypes";
import type { PerformanceDateRange } from "../../domain/performance/performanceDateRange";
import { useProjectCockpitModel } from "../../hooks/useProjectCockpitModel";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { buildJiraProjectBrowseUrl } from "../../platform/atlassianUrls";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import "./project-cockpit.css";

const FILTER_OPTIONS: { value: ProjectWorkFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Attention" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "completed", label: "Completed" },
];

export interface ProjectCockpitDrawerProps {
  projectKey: string | null;
  open: boolean;
  onClose: () => void;
  dateRange: PerformanceDateRange;
}

export function ProjectCockpitDrawer({
  projectKey,
  open,
  onClose,
  dateRange,
}: ProjectCockpitDrawerProps) {
  const { currentUser } = useCurrentUser();
  const { data } = usePerformanceData();
  const graph = useWorkGraph();
  const { rules: operationalRules } = useOperationalRules();
  const [filter, setFilter] = useState<ProjectWorkFilter>("all");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  const knowledgeLinks = useMemo(
    () =>
      projectKey
        ? [...(graph.knowledgeByProject.get(projectKey) ?? [])]
        : [],
    [graph.knowledgeByProject, projectKey],
  );

  const model = useProjectCockpitModel({
    projectKey,
    data,
    dateRange,
    currentUser,
    projects: graph.projects,
    knowledgeLinks,
    knowledgeUnavailable: graph.status === "unavailable",
    jiraBaseUrl,
    operationalRules,
  });

  useEffect(() => {
    if (!open) return;
    void loadPreferences().then((prefs) =>
      setJiraBaseUrl(resolveJiraBaseUrl(prefs)),
    );
  }, [open]);

  const filteredRows = useMemo(
    () => (model ? filterProjectWorkRows(model.workRows, filter) : []),
    [model, filter],
  );

  if (!open || !projectKey) return null;

  const openJiraProject = async () => {
    const prefs = await loadPreferences();
    const base = resolveJiraBaseUrl(prefs);
    await openExternalUrl(buildJiraProjectBrowseUrl(base, projectKey));
  };

  const openConfluenceSpace = async () => {
    if (!model?.knowledge.spaceUrl) return;
    await openExternalUrl(model.knowledge.spaceUrl);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={`Project ${projectKey}`}
      size="analytics"
      className="drawer--project-cockpit"
      header={
        model ? (
          <div className="project-cockpit__header">
            <div>
              <h2 className="project-cockpit__title">
                {model.identity.projectKey} · {model.identity.projectName}
              </h2>
              <p className="project-cockpit__meta">
                Period analytics: {model.periodLabel} · Current work is live
                state
              </p>
            </div>
            <div className="project-cockpit__header-actions">
              <Button type="button" variant="secondary" onClick={() => void openJiraProject()}>
                Open in Jira
              </Button>
              {model.knowledge.spaceUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void openConfluenceSpace()}
                >
                  Confluence space
                </Button>
              ) : null}
            </div>
          </div>
        ) : null
      }
    >
      {!model ? (
        <p className="project-cockpit__empty">Project data is not available.</p>
      ) : (
        <div className="project-cockpit__body" data-testid="project-cockpit">
          <section className="project-cockpit__section">
            <h3>Summary</h3>
            <p>
              {model.summary.active} active · {model.summary.inReview} in review ·{" "}
              {model.summary.completedInPeriod} completed in period ·{" "}
              {model.summary.problematic} at risk
            </p>
          </section>

          <section className="project-cockpit__section">
            <h3>Delivery (period)</h3>
            <ul className="project-cockpit__kpi-list">
              {model.kpis.map((kpi) => (
                <li key={kpi.label}>
                  <span>{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                </li>
              ))}
            </ul>
            {model.deliverySignals.length ? (
              <ul className="project-cockpit__signals">
                {model.deliverySignals.map((signal) => (
                  <li key={signal.id}>
                    {signal.count} · {signal.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="project-cockpit__section">
            <h3>Active work</h3>
            <SegmentedControl
              ariaLabel="Project work filter"
              value={filter}
              options={FILTER_OPTIONS}
              onChange={setFilter}
            />
            <div className="project-cockpit__table-wrap">
              <table className="project-cockpit__table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 40).map((row) => (
                    <tr key={row.issueKey}>
                      <td>
                        <button
                          type="button"
                          className="project-cockpit__link"
                          onClick={() =>
                            void openExternalUrl(
                              buildJiraIssueBrowseUrl(jiraBaseUrl, row.issueKey),
                            )
                          }
                        >
                          {row.issueKey}
                        </button>
                      </td>
                      <td>{row.title}</td>
                      <td>{row.status}</td>
                      <td>
                        {row.canOpenPerson && row.personId ? (
                          <button
                            type="button"
                            className="project-cockpit__link"
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent("metrio-open-person", {
                                  detail: row.personId,
                                }),
                              );
                            }}
                          >
                            {row.ownerName}
                          </button>
                        ) : (
                          row.ownerName
                        )}
                      </td>
                      <td>{row.stageAge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="project-cockpit__section">
            <h3>People</h3>
            {model.distribution.contributorCount > 0 ? (
              <p className="project-cockpit__muted">
                {model.distribution.totalActive} active tasks across{" "}
                {model.distribution.contributorCount} people
                {model.distribution.maxActiveOwnedByOne > 1
                  ? ` · up to ${model.distribution.maxActiveOwnedByOne} owned by one person`
                  : ""}
              </p>
            ) : (
              <p className="project-cockpit__muted">No active owners in scope.</p>
            )}
            <ul>
              {model.people.map((person) => (
                <li key={person.personId ?? person.displayName}>
                  {person.canOpenPerson && person.personId ? (
                    <button
                      type="button"
                      className="project-cockpit__link"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("metrio-open-person", {
                            detail: person.personId,
                          }),
                        );
                      }}
                    >
                      {person.displayName}
                    </button>
                  ) : (
                    person.displayName
                  )}
                  {" · "}
                  {person.activeCount} active
                  {person.inReviewCount ? ` · ${person.inReviewCount} in review` : ""}
                  {person.availabilityNote ? ` · ${person.availabilityNote}` : ""}
                </li>
              ))}
            </ul>
            {model.capacityNote ? (
              <p className="project-cockpit__muted">{model.capacityNote}</p>
            ) : null}
          </section>

          <section className="project-cockpit__section">
            <h3>Knowledge</h3>
            {model.knowledge.unavailable ? (
              <p className="project-cockpit__muted">Knowledge unavailable</p>
            ) : model.knowledge.totalCount === 0 ? (
              <p className="project-cockpit__muted">
                No linked Confluence pages found.
              </p>
            ) : (
              <>
                <ul>
                  {model.knowledge.previewPages.map((page) => (
                    <li key={page.id}>
                      <button
                        type="button"
                        className="project-cockpit__link"
                        onClick={() => void openExternalUrl(page.url)}
                      >
                        {page.title}
                      </button>
                      {page.spaceName ? ` · ${page.spaceName}` : ""}
                    </li>
                  ))}
                </ul>
                {model.knowledge.totalCount > 5 ? (
                  <p className="project-cockpit__muted">
                    {model.knowledge.totalCount} related pages in work graph
                  </p>
                ) : null}
              </>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
