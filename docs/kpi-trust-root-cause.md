# KPI vs drill-down contradiction (Daria · Completed 1)

## Reproduced state

| Surface | Source | Value |
|--------|--------|--------|
| **A. KPI header** | `PersonAnalyticsWorkspace` → `person.performance.completedCount` from `reportData.perUserKpi[canonicalKey]` | `1` |
| **B. Drawer evidence** | `useAnalyticsEvidence` → `buildAnalyticsEvidence` → `collectReportingPeriodCycles(scopedIssues, params)` | `0` rows in reporting window |

Header copy: `Daria Chernova · Completed` + `valueLabel` from KPI.

Body copy when `detailLevel === "task"` and `issues.length === 0`: **No completed work in this period.**

## Code paths

1. **Card / metric grid:** `buildPersonAnalyticsWorkspace` used `person.performance` (`personService.buildTeamSnapshot` ← `perUserKpi`).
2. **Drill-down:** `analyticsDrilldownModel.useAnalyticsEvidence` scoped issues from `grouped[personReportKey]` and (after 5D) derived KPI from `buildKpiFromIssues(scopedIssues)`.
3. **Mismatch:** `perUserKpi` can retain aggregate/historical completed count while **no cycles** fall in `params.dateFrom`–`dateTo` for attributed issues (or attribution vs assignee drift).

## Fix strategy

- **Display KPI** for a person: prefer `buildKpiFromIssues(person.issues, …)` when issue history exists; fall back to `perUserKpi` only when task detail is unavailable.
- **Evidence:** always use scoped issues + derived KPI; downgrade to **aggregate-only** when KPI > 0 but cycle evidence count = 0.
- **Empty copy:** only when displayed completed = 0 at task level.

Phase 10 historical attribution unchanged: `person.issues` remains the historical set; `ownedIssues` stays separate for operational views.
