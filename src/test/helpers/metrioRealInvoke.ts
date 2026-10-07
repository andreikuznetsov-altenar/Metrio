import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_APP_DATA = join(
  homedir(),
  "Library/Application Support/com.altenar.metrio",
);

interface LocalCredentialsFile {
  jira_api_token?: string;
  bamboo_api_token?: string;
}

interface JiraConfig {
  baseUrl: string;
  email: string;
}

function appDataDir(): string {
  return process.env.METRIO_APP_DATA?.trim() || DEFAULT_APP_DATA;
}

function readJson<T>(fileName: string): T {
  const raw = readFileSync(join(appDataDir(), fileName), "utf8");
  return JSON.parse(raw) as T;
}

function jiraAuthHeader(email: string, token: string): string {
  return `Basic ${Buffer.from(`${email}:${token}`, "utf8").toString("base64")}`;
}

async function jiraRequest(
  config: JiraConfig,
  endpoint: string,
  init?: RequestInit,
): Promise<unknown> {
  const credentials = readJson<LocalCredentialsFile>("credentials.local.json");
  const token = credentials.jira_api_token?.trim();
  if (!token) {
    throw new Error("Jira token unavailable in local credential store.");
  }
  const base = config.baseUrl.replace(/\/$/, "");
  const response = await fetch(`${base}${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: jiraAuthHeader(config.email, token),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Jira ${response.status}: ${text.slice(0, 200)}`);
  }
  return text.trim() ? JSON.parse(text) : {};
}

async function jiraFetchAllChangelog(
  config: JiraConfig,
  issueKey: string,
  maxResults: number,
): Promise<unknown[]> {
  const allValues: unknown[] = [];
  let startAt = 0;
  while (true) {
    const page = (await jiraRequest(
      config,
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/changelog?startAt=${startAt}&maxResults=${maxResults}`,
    )) as {
      values?: unknown[];
      isLast?: boolean;
      total?: number;
    };
    const values = page.values ?? [];
    allValues.push(...values);
    startAt += values.length;
    if (!values.length || page.isLast) break;
    if (page.total != null && startAt >= page.total) break;
  }
  return allValues;
}

export async function metrioRealInvoke(
  command: string,
  args?: Record<string, unknown>,
): Promise<unknown> {
  switch (command) {
    case "preferences_load":
      return { preferences: readJson("preferences.json"), corrupt: false };
    case "kpi_snapshot_load":
      return readJson("kpi_snapshots.json");
    case "kpi_snapshot_save":
      return null;
    case "log_write":
      return null;
    case "jira_search_issues": {
      const config = args?.config as JiraConfig;
      const params = args?.params as {
        jql: string;
        fields: string;
        maxResults: number;
        nextPageToken?: string;
      };
      let query = `jql=${encodeURIComponent(params.jql)}&maxResults=${params.maxResults}&fields=${encodeURIComponent(params.fields)}`;
      if (params.nextPageToken) {
        query += `&nextPageToken=${encodeURIComponent(params.nextPageToken)}`;
      }
      return jiraRequest(config, `/rest/api/3/search/jql?${query}`);
    }
    case "jira_fetch_changelog": {
      const config = args?.config as JiraConfig;
      const issueKey = String(args?.issueKey ?? "");
      const startAt = Number(args?.startAt ?? 0);
      const maxResults = Number(args?.maxResults ?? 100);
      return jiraRequest(
        config,
        `/rest/api/3/issue/${encodeURIComponent(issueKey)}/changelog?startAt=${startAt}&maxResults=${maxResults}`,
      );
    }
    case "jira_fetch_changelogs_batch": {
      const config = args?.config as JiraConfig;
      const params = args?.params as {
        issue_keys: string[];
        max_results: number;
      };
      const items = [];
      for (const issueKey of params.issue_keys) {
        const values = await jiraFetchAllChangelog(
          config,
          issueKey,
          params.max_results,
        );
        items.push({ issue_key: issueKey, values });
      }
      return items;
    }
    case "jira_get_issue": {
      const config = args?.config as JiraConfig;
      const issueKey = String(args?.issueKey ?? "");
      const fields = String(args?.fields ?? "");
      return jiraRequest(
        config,
        `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${encodeURIComponent(fields)}`,
      );
    }
    case "jira_get_project_statuses": {
      const config = args?.config as JiraConfig;
      const projectKey = String(args?.projectKey ?? "");
      return jiraRequest(
        config,
        `/rest/api/3/project/${encodeURIComponent(projectKey)}/statuses`,
      );
    }
    case "jira_search_users": {
      const config = args?.config as JiraConfig;
      const query = String(args?.query ?? "");
      return jiraRequest(
        config,
        `/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=20`,
      );
    }
    case "bamboo_get_whos_out":
      return [];
    case "bamboo_request":
      throw new Error("bamboo_request_unavailable_in_reconcile_runner");
    default:
      throw new Error(`Unsupported invoke in reconcile runner: ${command}`);
  }
}
