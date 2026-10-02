# Phase 10 — Current Jira ownership vs historical attribution

## Root cause

`findMatchingTeamMembersForIssue()` matched current assignee plus historical Assignee changelog participants. `buildEnhancedJiraAuditReport()` pushed the same issue into every matched user’s `grouped[canonical].issues`. `buildTeamSnapshot()` copied that set into `Person.issues`, and operational UI read `Person.issues` — so one Jira key appeared under multiple people (e.g. UX-2962 under Andrei and Valeriia).

## Preserved semantics

- **`Person.issues`** — historically attributed issues (KPI, work history, backflows, snapshots, team unique-issue rollups where applicable).
- Per-user KPI in `report.ts` / `perUserKpi` unchanged in this phase.

## Current ownership model

- **`AuditIssue`**: `currentAssigneeCanonical`, `currentAssigneeAccountId`, `currentAssigneeDisplayName` from live `fields.assignee` via `resolveCurrentAssigneeFromFields()` (not from changelog).
- **`Person.ownedIssues`**: `filterOwnedIssues(issues, person.jira.canonicalKey)`.
- **`getOperationalIssues()`** / **`getActiveIssues()`** use `ownedIssues` for active work, workload counts, radar, delivery risk, drawer Work/Attention, notifications, My Week active slices.

## Intentional `Person.issues` call sites (historical)

| Area | File |
|------|------|
| Work history | `workHistory.ts` |
| My Week completed / backflows | `myWeek.ts` |
| Period metrics | `issuePeriodMetrics.ts` |
| Historical flow / snapshots | `historicalFlow.ts`, `snapshotEngine.ts` |
| Team dedupe for reporting | `uniqueIssues.ts` |

## Tests

- `ownedIssues.test.ts`, `ownershipSemantics.test.ts` (ABC-123 handoff, delivery risk dedupe, radar).
- `hiddenAttentionKeyCount` (+N more drawer).
- Visual fixture: person-02 keeps UX-2962 in `issues` but not in `ownedIssues`.

## Packaged real-data QA (required before commit)

Verify UX-2962, UX-5243, UX-5421 against current Jira assignee in Attention, Radar, Delivery Risk, drawer Work, and Active workload counts.
