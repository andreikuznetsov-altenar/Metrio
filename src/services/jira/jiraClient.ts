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

export interface JiraChangelogPartialFailure {
  issueKey: string;
  code: string;
  status?: number;
  message: string;
}

export interface JiraChangelogBatchResult {
  changelogs: Map<string, unknown[]>;
  /** Per-issue enrichment failures that did not abort the batch. */
  partialFailures: JiraChangelogPartialFailure[];
}

const CHANGELOG_AUTH_CODES = new Set([
  'jira_auth_invalid',
  'credential_missing',
  'keychain_error',
]);

function isChangelogAuthFailure(failure: JiraChangelogPartialFailure): boolean {
  return (
    CHANGELOG_AUTH_CODES.has(failure.code) ||
    failure.status === 401
  );
}

import { incrementApiRequest } from '../../platform/observability/observabilityStore';

async function invokeJira<T>(command: string, args: Record<string, unknown>): Promise<T> {
  incrementApiRequest('jira');
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
    const fields = [
      'summary',
      'assignee',
      'status',
      'created',
      'issuetype',
      'parent',
      'reporter',
      'project',
      'issuelinks',
      'duedate',
    ];
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

  /**
   * Fetch changelogs for many issues.
   * Per-issue transport/timeout/404 failures are OPTIONAL enrichment — they do not
   * reject the batch. Systemic auth failures (401/credential) across a chunk escalate.
   */
  async fetchAllChangelogsBatch(
    issueKeys: string[],
    concurrency = 4,
    options?: {
      onProgress?: (completed: number, total: number) => void;
      shouldAbort?: () => boolean;
      chunkSize?: number;
    },
  ): Promise<JiraChangelogBatchResult> {
    const map = new Map<string, unknown[]>();
    const partialFailures: JiraChangelogPartialFailure[] = [];
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

      const authFailures: JiraChangelogPartialFailure[] = [];
      for (const item of result) {
        if (item.error) {
          const failure: JiraChangelogPartialFailure = {
            issueKey: item.issue_key,
            code: item.error.code || 'unknown',
            status: item.error.status,
            message: item.error.message || 'Changelog fetch failed',
          };
          if (isChangelogAuthFailure(failure)) {
            authFailures.push(failure);
          }
          // Keep an empty changelog so report builders do not re-fetch and throw.
          map.set(item.issue_key, []);
          partialFailures.push(failure);
          continue;
        }
        map.set(item.issue_key, Array.isArray(item.values) ? item.values : []);
      }

      // If every issue in the chunk failed auth, the session/token is unusable — CORE failure.
      if (chunk.length > 0 && authFailures.length === chunk.length) {
        const err = parseInvokeError({
          code: authFailures[0]?.code || 'jira_auth_invalid',
          message: authFailures[0]?.message || 'Jira authentication failed',
          status: authFailures[0]?.status,
        });
        Object.assign(err, { issueKey: authFailures[0]?.issueKey });
        throw err;
      }

      options?.onProgress?.(Math.min(offset + chunk.length, total), total);
    }

    return { changelogs: map, partialFailures };
  }

  async searchIssues(
    jql: string,
    maxResults = 8,
    fields = "summary,status",
  ): Promise<unknown[]> {
    const response = await invokeJira<{ issues?: unknown[] }>(
      "jira_search_issues",
      {
        config: this.nativeConfig,
        params: {
          jql,
          fields,
          maxResults,
        },
      },
    );
    return response.issues ?? [];
  }

  async fetchIssuesByKeys(issueKeys: string[]): Promise<unknown[]> {
    const unique = [...new Set(issueKeys.map((k) => k.trim()).filter(Boolean))];
    if (!unique.length) return [];
    const chunkSize = 50;
    const all: unknown[] = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const jql = `key in (${chunk.map((k) => `"${k.replace(/"/g, "")}"`).join(",")})`;
      const issues = await this.fetchAllIssues(jql);
      all.push(...issues);
    }
    return all;
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

  async listProjects(maxResults = 50): Promise<
    Array<{ id: string; key: string; name: string }>
  > {
    return invokeJira('jira_list_projects', {
      config: this.nativeConfig,
      maxResults,
    });
  }

  async fetchRemoteLinksBatch(
    issueKeys: string[],
    concurrency = 4,
  ): Promise<
    Array<{
      issueKey: string;
      links: Array<{ url: string; title?: string }>;
      error?: { code: string; message: string };
    }>
  > {
    const raw = await invokeJira<
      Array<{
        issue_key: string;
        links: Array<{ url: string; title?: string }>;
        error?: { code: string; message: string };
      }>
    >('jira_fetch_remotelinks_batch', {
      config: this.nativeConfig,
      params: { issueKeys, concurrency },
    });
    return raw.map((item) => ({
      issueKey: item.issue_key,
      links: item.links,
      error: item.error,
    }));
  }
}
