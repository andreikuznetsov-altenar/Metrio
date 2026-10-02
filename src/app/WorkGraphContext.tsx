import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { resolveJiraBaseUrl } from "../config/product";
import { discoverRelevantProjects } from "../domain/workGraph/projectDiscovery";
import type { WorkKnowledgeLink, WorkProject } from "../domain/workGraph/workGraphTypes";
import { getOperationalIssues } from "../domain/people/ownedIssues";
import type { Person } from "../domain/people/types";
import { bumpKnowledgeDatasetGeneration } from "../services/knowledge/knowledgeSessionCache";
import {
  resolveIssueKnowledgeBatch,
  resolveProjectKnowledge,
} from "../services/knowledge/workGraphKnowledgeService";
import { JiraClient } from "../services/jira/jiraClient";
import { getWorkEmail, loadPreferences } from "../platform/preferences";
import type { ReportParams } from "../domain/jira/types";

export interface WorkGraphState {
  status: "idle" | "loading" | "ready" | "unavailable";
  projects: WorkProject[];
  knowledgeByIssue: Map<string, WorkKnowledgeLink[]>;
  knowledgeByProject: Map<string, WorkKnowledgeLink[]>;
}

const EMPTY: WorkGraphState = {
  status: "idle",
  projects: [],
  knowledgeByIssue: new Map(),
  knowledgeByProject: new Map(),
};

const WorkGraphContext = createContext<WorkGraphState>(EMPTY);

export function useWorkGraph(): WorkGraphState {
  return useContext(WorkGraphContext);
}

export interface WorkGraphProviderProps {
  person: Person | null;
  params: ReportParams | undefined;
  datasetKey: string;
  department?: string;
  children: ReactNode;
}

export function WorkGraphProvider({
  person,
  params,
  datasetKey,
  department,
  children,
}: WorkGraphProviderProps) {
  const [state, setState] = useState<WorkGraphState>(EMPTY);
  const loadSeq = useRef(0);

  useEffect(() => {
    if (!person || !params) {
      setState(EMPTY);
      return;
    }

    const seq = ++loadSeq.current;
    setState((prev) => ({ ...prev, status: "loading" }));

    void (async () => {
      try {
        const prefs = await loadPreferences();
        const email = getWorkEmail(prefs);
        const jiraBase = resolveJiraBaseUrl(prefs);
        const jira = new JiraClient({ baseUrl: jiraBase, email });
        const config = { baseUrl: jiraBase, email };

        const activeIssues = getOperationalIssues(person);
        const activeKeys = activeIssues.map((i) => i.issueKey).filter(Boolean);
        const recentKeys = person.issues
          .slice(0, 30)
          .map((i) => i.issueKey);

        const [projectsMeta, remoteBatch] = await Promise.all([
          jira.listProjects(50).catch(() => []),
          jira.fetchRemoteLinksBatch(activeKeys.slice(0, 25)).catch(() => []),
        ]);

        if (seq !== loadSeq.current) return;

        const remoteLinks = remoteBatch.flatMap((item) =>
          item.links.map((link) => ({
            issueKey: item.issueKey,
            url: link.url,
            title: link.title,
          })),
        );

        const projects = discoverRelevantProjects({
          activeIssues,
          recentCompletedIssues: person.issues.filter((i) =>
            recentKeys.includes(i.issueKey),
          ),
          accessibleProjects: projectsMeta,
          jiraBaseUrl: jiraBase,
        });

        const projectSpaceByKey: Record<string, string> = {};
        for (const project of projects) {
          if (project.linkedSpaceKey) {
            projectSpaceByKey[project.key] = project.linkedSpaceKey;
          }
        }

        const knowledgeByIssue = await resolveIssueKnowledgeBatch({
          config,
          siteBaseUrl: jiraBase,
          issueKeys: activeKeys.slice(0, 25),
          remoteLinks,
          projectSpaceByKey,
        });

        if (seq !== loadSeq.current) return;

        const knowledgeByProject = new Map<string, WorkKnowledgeLink[]>();
        const topProjects = projects.filter((p) => p.relevance !== "accessible").slice(0, 3);
        for (const project of topProjects) {
          const spaceKey = project.linkedSpaceKey ?? project.key;
          const docs = await resolveProjectKnowledge({
            config,
            projectKey: project.key,
            spaceKey,
            department,
            limit: 3,
          });
          knowledgeByProject.set(project.key, docs);
          project.linkedSpaceKey = spaceKey;
          if (!project.jiraUrl) {
            project.jiraUrl = `${jiraBase}/browse/${project.key}`;
          }
        }

        if (seq !== loadSeq.current) return;

        setState({
          status: "ready",
          projects,
          knowledgeByIssue,
          knowledgeByProject,
        });
      } catch {
        if (seq !== loadSeq.current) return;
        setState({ ...EMPTY, status: "unavailable" });
      }
    })();
  }, [person, params, datasetKey, department]);

  useEffect(() => {
    bumpKnowledgeDatasetGeneration();
  }, [datasetKey]);

  const value = useMemo(() => state, [state]);
  return (
    <WorkGraphContext.Provider value={value}>{children}</WorkGraphContext.Provider>
  );
}
