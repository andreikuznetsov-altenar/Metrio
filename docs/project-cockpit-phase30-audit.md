# Project Cockpit — Phase 30 Jira hierarchy audit

Audit based on the connected Metrio Jira pipeline (`jiraClient`, `domain/jira/report.ts`, `AuditIssue`, work graph), not assumptions about Jira Cloud defaults.

## Available on issues (reporting pipeline)

| Field | Source | Notes |
|--------|--------|--------|
| Project key | Parsed from `issueKey` (`UX-123` → `UX`) | Primary project identity in Metrio |
| Project name | `jira_list_projects` + discovery | Via `discoverRelevantProjects` |
| Issue type | `fields.issuetype.name` | Includes **Design Improvement** special-case |
| Parent | `fields.parent` | Used when resolving epics |
| Epic link | `customfield_10006` (`JIRA_CONFIG.EPIC_LINK_FIELD`) | Company-specific; fetched when parent is not epic |
| Epic summary/status | Resolved via `resolveEpicInfo` → stored on `AuditIssue` as `epicKey`, `epicSummary`, `epicStatus` | Not a separate initiative tier |
| Summary, status, assignee | Base Jira fields | `currentStatus`, assignee canonical on `AuditIssue` |
| Content type | `customfield_10859` | Altenar-specific |
| Reporter | Base field | Identity resolution |
| Remote / Confluence links | `jira_fetch_remotelinks_batch` + work graph | Phase 23 knowledge |
| Changelog | Batch fetch | Cycles, backflows, KPI |

## Not available in current `AuditIssue` / fetch fields

| Field | Status |
|--------|--------|
| Due date | **Not fetched** — cockpit cannot show due-date vs leave signals until fields are added |
| Fix version | Not in base field list |
| Sprint | Not in base field list |
| Components / labels | Not normalized on `AuditIssue` |
| Initiative (higher than epic) | **No dedicated field** — only epic via parent / epic link |
| Project description | Not stored; name only from project list API |

## Hierarchy as Metrio sees it

1. **Project** — issue key prefix / `fields.project` implicit via key.
2. **Epic** — issue type `Epic`, parent epic, or epic custom field.
3. **Initiative** — **not modeled**; do not invent. Epic may be shown as optional grouping inside a project.

## Confluence

- Project space heuristic: `linkedSpaceKey` often equals project key in work graph.
- Knowledge: explicit remote links, issue-key search, project-key search (cached session).

## Implications for Phase 30

- **Project-only mode** is the default; **epic-scoped** filter when `epicKey` is set on issues.
- No initiative cockpit unless future Jira fields are added.
- Due-date / leave overlap: deferred until `duedate` is ingested.
