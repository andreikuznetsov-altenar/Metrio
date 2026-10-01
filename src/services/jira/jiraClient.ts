import { invoke } from '@tauri-apps/api/core';
import { JIRA_CONFIG } from '../../domain/jira/config';
import { parseInvokeError } from '../../platform/apiTypes';

export interface JiraClientConfig {
  baseUrl: string;
  email: string;
}

interface ChangelogBatchItem {
  issue_key: string;
  values: unknown[];
  error?: { code: string; message: string; status?: number };
}

async function invokeJira<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw parseInvokeError(e);
  }
}

export class JiraClient {
  constructor(private config: JiraClientConfig) {}

  private get nativeConfig() {
    return { baseUrl: this.config.baseUrl, email: this.config.email };
  }

  async testConnection(): Promise<{
    accountId: string;
    displayName: string;
    emailAddress?: string;
  }> {
    const me = await invokeJira<{
      accountId?: string;
      displayName?: string;
      emailAddress?: string;
    }>('jira_test_connection', {
      config: this.nativeConfig,
    });
    return {
      accountId: me.accountId || '',
      displayName: me.displayName || 'Connected',
      emailAddress: me.emailAddress,
    };
  }

  getBaseFields(): string[] {
    const fields = ['summary', 'assignee', 'status', 'created', 'issuetype', 'parent', 'reporter', 'project'];
    if (JIRA_CONFIG.CONTENT_TYPE_FIELD) fields.push(JIRA_CONFIG.CONTENT_TYPE_FIELD);
    if (JIRA_CONFIG.EPIC_LINK_FIELD) fields.push(JIRA_CONFIG.EPIC_LINK_FIELD);
    return fields;
  }

  async fetchAllIssues(jql: string, fieldsOverride?: string): Promise<unknown[]> {
    let nextPageToken = '';
    const allIssues: unknown[] = [];
    const fields = fieldsOverride || this.getBaseFields().join(',');

    while (true) {
      const response = await invokeJira<{ issues?: unknown[]; nextPageToken?: string }>(
        'jira_search_issues',
        {
          config: this.nativeConfig,
          params: {
            jql,
            fields,
            maxResults: JIRA_CONFIG.SEARCH_PAGE_SIZE,
            nextPageToken: nextPageToken || undefined,
          },
        },
      );

      const issues = response.issues || [];
      allIssues.push(...issues);
      nextPageToken = response.nextPageToken || '';
      if (!nextPageToken || issues.length === 0) break;
    }

    return allIssues;
  }

  async fetchAllChangelog(issueKey: string): Promise<unknown[]> {
    let startAt = 0;
    const maxResults = JIRA_CONFIG.CHANGELOG_PAGE_SIZE;
    const allValues: unknown[] = [];

    while (true) {
      const response = await invokeJira<{
        values?: unknown[];
        isLast?: boolean;
        total?: number;
      }>('jira_fetch_changelog', {
        config: this.nativeConfig,
        issueKey,
        startAt,
        maxResults,
      });

      const values = response.values || [];
      allValues.push(...values);
      startAt += values.length;

      if (!values.length || response.isLast === true) break;
      if (response.total && startAt >= response.total) break;
    }

    return allValues;
  }

  async fetchAllChangelogsBatch(
    issueKeys: string[],
    concurrency = 4,
    options?: {
      onProgress?: (completed: number, total: number) => void;
      shouldAbort?: () => boolean;
      chunkSize?: number;
    },
  ): Promise<Map<string, unknown[]>> {
    const map = new Map<string, unknown[]>();
    const chunkSize = options?.chunkSize ?? Math.max(concurrency * 4, 20);
    const total = issueKeys.length;

    for (let offset = 0; offset < issueKeys.length; offset += chunkSize) {
      if (options?.shouldAbort?.()) {
        throw new Error('Report refresh cancelled');
      }

      const chunk = issueKeys.slice(offset, offset + chunkSize);
      const result = await invokeJira<ChangelogBatchItem[]>('jira_fetch_changelogs_batch', {
        config: this.nativeConfig,
        params: {
          issue_keys: chunk,
          concurrency,
          max_results: JIRA_CONFIG.CHANGELOG_PAGE_SIZE,
        },
      });

      for (const item of result) {
        if (item.error) {
          const err = parseInvokeError({
            code: item.error.code,
            message: item.error.message,
            status: item.error.status,
          });
          Object.assign(err, { issueKey: item.issue_key });
          throw err;
        }
        map.set(item.issue_key, Array.isArray(item.values) ? item.values : []);
      }

      options?.onProgress?.(Math.min(offset + chunk.length, total), total);
    }

    return map;
  }

  async fetchIssueByKey(issueKey: string): Promise<unknown> {
    const fields = this.getBaseFields().join(',');
    return invokeJira('jira_get_issue', {
      config: this.nativeConfig,
      issueKey,
      fields,
    });
  }

  async resolveTeamUsersForAudit(requestedUsers: string[]) {
    return Promise.all(
      requestedUsers.map(async (inputUser) => {
        const normalizedInput = String(inputUser || '').trim().toLowerCase();
        let resolved: {
          emailAddress?: string;
          displayName?: string;
          accountId?: string;
        } | null = null;

        try {
          const users = await invokeJira<
            Array<{ emailAddress?: string; displayName?: string; accountId?: string }>
          >('jira_search_users', {
            config: this.nativeConfig,
            query: inputUser,
          });

          resolved = users[0] || null;
          for (const candidate of users) {
            const candidateEmail = String(candidate.emailAddress || '').trim().toLowerCase();
            const candidateAccountId = String(candidate.accountId || '').trim().toLowerCase();
            const candidateName = String(candidate.displayName || '').trim().toLowerCase();
            if (
              candidateEmail === normalizedInput ||
              candidateAccountId === normalizedInput ||
              candidateName === normalizedInput
            ) {
              resolved = candidate;
              break;
            }
          }
        } catch {
          // unresolved
        }

        return {
          canonical: String(inputUser || '').trim(),
          inputUser: String(inputUser || '').trim(),
          email: resolved?.emailAddress ? resolved.emailAddress : String(inputUser || '').trim(),
          displayName: resolved?.displayName ? resolved.displayName : String(inputUser || '').trim(),
          accountId: resolved?.accountId ? resolved.accountId : '',
        };
      }),
    );
  }
}
