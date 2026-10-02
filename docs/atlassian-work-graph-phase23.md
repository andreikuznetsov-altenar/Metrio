# Atlassian work graph audit (Phase 23)

Corporate site: **Altenar Cloud** (`https://altenar.atlassian.net`), same credential as Jira (`JIRA_TOKEN_KEY` + work email).

## Jira APIs used / added in Phase 23

| Capability | REST | Notes |
|------------|------|--------|
| Current user | `GET /rest/api/3/myself` | Existing |
| Issue search | `GET /rest/api/3/search/jql` | Assigned/recent work via existing Performance JQL |
| Issue fields | `GET /rest/api/3/issue/{key}?fields=…` | Epic/parent via `epicKey` on normalized `AuditIssue` |
| **Project search** | `GET /rest/api/3/project/search` | **Phase 23** — projects visible to token holder |
| **Remote links** | `GET /rest/api/3/issue/{key}/remotelink` | **Phase 23** — explicit Confluence URLs on issues |

Project metadata does not automatically include Confluence space id in all tenants; Metrio maps **project key → space key** when keys match or when remote links / CQL results confirm a space.

## Confluence APIs (Phase 21+)

| Capability | REST |
|------------|------|
| Current user | `GET /wiki/rest/api/user/current` |
| CQL search | `GET /wiki/rest/api/content/search?cql=…` |

Search is scoped with `space = KEY AND …` when a linked space is known.

## Relationship sources (confidence)

1. **explicit_link** — Jira `remotelink` URL points to Confluence page
2. **exact_issue_key** — CQL/text match for `UX-1234` in scoped space
3. **explicit_project_space** — project key aligned with Confluence space key (tenant convention)
4. **exact_project_key** — CQL for project/initiative/epic identifier in scoped space
5. **contextual_search** — bounded fuzzy title search in scoped space only (labeled “Suggested documentation”)

## Relevance rules

- Employee project list: assigned active work → recent completed → explicit project links — not all `project/search` results
- Department (Bamboo) is ranking only, not authorization
- 403/404 results dropped; no permission bypass

## Non-goals (Phase 23)

- Graph visualization UI
- Global Confluence search box
- Persisting full page bodies or scoring employees on documentation activity
