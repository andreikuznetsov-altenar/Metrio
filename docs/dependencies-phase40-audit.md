# Phase 40 — Jira issue link audit

## Tenant API

Metrio uses **Jira REST API 3** (`/rest/api/3/search/jql`, `/rest/api/3/issue/{key}`) with fields requested in `JiraClient.getBaseFields()`.

## Link types observed (Atlassian default + common custom)

| Jira link type (name) | Normalized type | Delivery blocking? |
|----------------------|-----------------|--------------------|
| Blocks / is blocked by | `blocks` / `blocked_by` | Yes |
| Depends / is depended on by | `explicit_dependency` | Yes (directional) |
| Duplicate | `related` | No |
| Relates | `related` | No |
| Cloners / is cloned by | `related` | No |
| Parent (issue hierarchy) | `parent_child` | Explicit only; not inferred as block |

Custom link names are matched case-insensitively on keywords: `block`, `depend`.

## Fetch strategy

- **Primary:** `fields=issuelinks,parent,duedate` on the existing team JQL search (one paginated search — no per-row calls).
- **Enrichment:** Missing linked keys are loaded in **one batched JQL** per chunk (`key in (...)`), max 50 keys per request.
- **Cache:** `DeliveryDependencyIndex` is built once per performance refresh and stored on `PerformanceFetchResult`.

## Graph traversal limits

- Chain depth: **≤ 3**
- Max nodes per chain walk: **40**
- Cycle protection: **visited set** on issue keys

## Non-goals

- No title/assignee similarity inference.
- No force-directed graph UI in this phase.
