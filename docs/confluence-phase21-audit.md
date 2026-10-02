# Confluence integration audit (Phase 21)

## Existing Atlassian / Jira setup

| Item | Location |
|------|-----------|
| Site base URL | App preferences (`jira.baseUrl`) via product config |
| Account email | Preferences + Jira client config |
| API token | Secure store key `JIRA_TOKEN_KEY` (same as Jira) |
| Native proxy | `src-tauri/src/api/jira.rs` — Basic auth, no browser credentials |
| Frontend | `src/services/jira/jiraClient.ts` — `invoke()` only |

## Conclusion for Phase 21

- Metrio already uses **one Atlassian Cloud API token** for Jira.
- Confluence Cloud on the **same site** accepts the **same email + API token** for read-only REST (`/wiki/rest/api/...`).
- Phase 21 adds `src-tauri/src/api/confluence.rs` and `confluence_test_connection` / `confluence_search_pages` reusing `JiraConfig` + `JIRA_TOKEN_KEY`.
- **No second credential field** in Settings when Jira is connected; UI may show “Jira + Confluence” under Atlassian.

## Scope

- Read-only: test connection, search, page metadata, open in browser.
- No page create/edit/delete, no local full-body persistence, no permission bypass.

## Failure isolation

- Confluence errors must not block Performance load; knowledge sections show “Knowledge unavailable” only where context depends on Confluence.
