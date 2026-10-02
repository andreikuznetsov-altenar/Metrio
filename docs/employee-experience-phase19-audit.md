# Employee Experience Phase 19 — Audit

Baseline: `3860570191ebb84bfe63f67661883554a0316e1e`

## Scope

Employee Performance subnav (unchanged): **Overview**, **My Week**, **Trends**, **Work History**.

## Files reviewed

| UI | View model / domain |
| --- | --- |
| `EmployeePerformanceOverview.tsx` | `performanceViewModel.ts` → `buildEmployeeSnapshot` |
| `EmployeePerformanceSubnav.tsx` | `buildPersonAnalyticsWorkspace` (manager person drawer) |
| `EmployeeMyWeekView.tsx` | `buildMyWeek` |
| `EmployeeTrendsView.tsx` | `buildPersonTrendCards` / workspace trends |
| `EmployeeWorkHistoryView.tsx` | `buildWorkHistory` via `mapWorkHistoryGroups` |

## Old UI primitives (pre–Phase 19)

- Generic `Card` KPI blocks without comparison context or drill-down on Overview.
- Duplicate headings: “Overview” + “My metrics”.
- Plain `performance-work-row` without stage age, health, or Jira action.
- Flat attention rows (one row per signal, no grouping).
- Work History as full HTML `<table>` with project column.
- My Week: five generic metric cards + “None” empty groups.
- Trends: `Card` wrapper without point drill-down for employees.
- **My profile** button opening `PersonDetailDrawer` (duplicates person analytics).

## Duplicated metric presentation

- Employee `buildEmployeeSnapshot` rebuilt KPIs separately from `buildPersonAnalyticsWorkspace.summary` (missing `contextLabel` / trend comparison).
- Employee trends duplicated `buildPersonalTrendCards` vs workspace `buildPersonTrendCards`.
- History groups duplicated between employee snapshot and person workspace.

## Already backed by person-scoped analytics

- `getPersonAnalytics(personId)` → full `PersonAnalyticsWorkspace` (summary, trends, attention, work rows, time off, history).
- `buildAnalyticsEvidence` + `personKpiFromReport` / `personIssuesFromReport` (Phase 16).
- `PersonWorkRow`, `AnalyticsIssueRow`, `groupAttentionSignals`, `TrendMiniChart`, Phase 15 drill-down drawer.

## Safe reuse of Phase 15/16 evidence

- KPI drill-down: `openPersonMetricDrilldown` / `buildMetricDrilldownRequest` with `personId`.
- Trend point drill-down: `buildTrendDrilldownRequest` with person scope.
- Efficiency / first pass / completed / backflows drawers — same evidence pipeline as manager person view.

## Manager / person drawer only (before Phase 19)

- Interactive KPI + trend drill-down (employee blocked by `canViewTeamDashboard` gate on `AnalyticsDrilldownDrawer`).
- Grouped attention with issue keys.
- Work History as `AnalyticsIssueRow` list with pagination.
- `METRIC_HELP` + HelpIcon on KPI labels (team overview pattern).

## Access control (unchanged semantics)

- `canOpenPersonDetail` in `personAccess.ts` — self OK, other employees blocked.
- Gap: analytics context did not re-check `canOpenPerson` on drill-down; team drill-down had no employee guard.

## Phase 19 direction

- Single person analytics source for employee KPIs, attention, work, trends, history.
- Self-scoped drill-down for all roles; team drill-down only when team dashboard allowed.
- Shared presentation components; no second employee evidence builder.
