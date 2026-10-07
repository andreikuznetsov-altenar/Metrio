import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { DrawerPanelPlaceholder } from "../../components/Drawer/DrawerPanelPlaceholder";
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
import { JiraIssueLink } from "../../components/JiraIssueLink/JiraIssueLink";
import { DependencyDetailDrawer } from "./DependencyDetailDrawer";
import type { ProjectDependencyRow } from "../../domain/dependencies/dependencyTypes";
import type { WorkDependency } from "../../domain/dependencies/dependencyTypes";
import { METRIO_TABLE_CLASS, MetrioTableWrap, TableClampCell } from "../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import type { AuditIssue } from "../../domain/jira/types";
import "./project-cockpit.css";

const WORK_COLUMNS = [
  { id: "key", type: "issueKey" as const },
  { id: "title", type: "text" as const },
  { id: "status", type: "status" as const },
  { id: "owner", type: "text" as const },
  { id: "age", type: "duration" as const },
];

const DEP_COLUMNS = [
  { id: "source", type: "issueKey" as const },
  { id: "target", type: "issueKey" as const },
  { id: "route", type: "text" as const },
];

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
  const [selectedDependency, setSelectedDependency] = useState<WorkDependency | null>(
    null,
  );

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

  const workGetValue = useMemo(
    () => (row: import("../../domain/projectCockpit/projectCockpitTypes").ProjectWorkRow, columnId: string) => {
      switch (columnId) {
        case "key":
          return row.issueKey;
        case "title":
          return row.title;
        case "status":
          return row.status;
        case "owner":
          return row.ownerName;
        case "age":
          return row.stageAge;
        default:
          return "";
      }
    },
    [],
  );

  const workSort = useTableSort(filteredRows, WORK_COLUMNS, workGetValue);

  const blockedDeps = model?.dependencies.blocked ?? [];

  const depGetValue = useMemo(
    () => (row: ProjectDependencyRow, columnId: string) => {
      const dep = row.dependency;
      switch (columnId) {
        case "source":
          return dep.sourceIssueKey;
        case "target":
          return dep.targetIssueKey;
        case "route":
          return dep.crossProject
            ? `${dep.sourceProject}→${dep.targetProject}`
            : dep.sourceProject;
        default:
          return "";
      }
    },
    [],
  );

  const depSort = useTableSort(blockedDeps, DEP_COLUMNS, depGetValue);

  const issueByKey = useMemo(() => {
    const map = new Map<string, AuditIssue>();
    if (!data?.teamSnapshot) return map;
    for (const person of data.teamSnapshot.persons) {
      for (const issue of [...person.issues, ...person.ownedIssues]) {
        map.set(issue.issueKey, issue);
      }
    }
    return map;
  }, [data?.teamSnapshot]);

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
        <DrawerPanelPlaceholder
          className="project-cockpit__empty"
          title="Project data is not available."
        />
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

          <section
            className="project-cockpit__section"
            data-testid="project-cockpit-dependencies"
          >
            <h3>Dependencies</h3>
            <p className="project-cockpit__muted">{model.dependencies.summaryLine}</p>
            {blockedDeps.length ? (
              <MetrioTableWrap testId="project-cockpit-dependencies-table">
                <table className={METRIO_TABLE_CLASS}>
                  <thead>
                    <tr>
                      <SortableTableHeader
                        columnId="source"
                        label="Blocked issue"
                        sort={depSort.sort}
                        onToggle={depSort.toggleSort}
                      />
                      <SortableTableHeader
                        columnId="target"
                        label="Blocked by"
                        sort={depSort.sort}
                        onToggle={depSort.toggleSort}
                      />
                      <SortableTableHeader
                        columnId="route"
                        label="Route"
                        sort={depSort.sort}
                        onToggle={depSort.toggleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {depSort.sortedRows.map((row) => (
                      <tr
                        key={row.dependency.id}
                        className="performance-table__clickable-row"
                        onClick={() => setSelectedDependency(row.dependency)}
                      >
                        <td>{row.dependency.sourceIssueKey}</td>
                        <td>{row.dependency.targetIssueKey}</td>
                        <td>
                          {row.dependency.crossProject
                            ? `${row.dependency.sourceProject}→${row.dependency.targetProject}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MetrioTableWrap>
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
            <MetrioTableWrap>
              <table className={METRIO_TABLE_CLASS}>
                <thead>
                  <tr>
                    <SortableTableHeader
                      columnId="key"
                      label="Key"
                      sort={workSort.sort}
                      onToggle={workSort.toggleSort}
                    />
                    <SortableTableHeader
                      columnId="title"
                      label="Title"
                      sort={workSort.sort}
                      onToggle={workSort.toggleSort}
                    />
                    <SortableTableHeader
                      columnId="status"
                      label="Status"
                      sort={workSort.sort}
                      onToggle={workSort.toggleSort}
                    />
                    <SortableTableHeader
                      columnId="owner"
                      label="Owner"
                      sort={workSort.sort}
                      onToggle={workSort.toggleSort}
                    />
                    <SortableTableHeader
                      columnId="age"
                      label="Age"
                      sort={workSort.sort}
                      onToggle={workSort.toggleSort}
                      className="performance-table__num"

                    />
                  </tr>
                </thead>
                <tbody>
                  {workSort.sortedRows.slice(0, 40).map((row) => (
                    <tr key={row.issueKey}>
                      <td>
                        <JiraIssueLink
                          issueKey={row.issueKey}
                          jiraBaseUrl={jiraBaseUrl}
                          className="project-cockpit__link"
                        />
                      </td>
                      <TableClampCell title={row.title}>{row.title}</TableClampCell>
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
                      <td className="performance-table__num">{row.stageAge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MetrioTableWrap>
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
      <DependencyDetailDrawer
        dependency={selectedDependency}
        index={data?.dependencyIndex ?? null}
        jiraBaseUrl={jiraBaseUrl}
        issueByKey={issueByKey}
        open={selectedDependency != null}
        onClose={() => setSelectedDependency(null)}
      />
    </Drawer>
  );
}
