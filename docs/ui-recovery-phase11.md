# Phase 11 — Filter correctness + analytics UI (in progress)

## KPI date filter (done in code)

**Root cause:** `getCycleSegments` read `rangeEvents` (changelog clipped to the display window), so cycles could not be reconstructed across range boundaries; KPI counts did not reliably change with From/To.

**Fix:** segments built from full `issue.events`; `buildKpiFromIssues` / first-pass count only **completed cycles whose Review→Done `endedAt` falls in `dateFrom`–`dateTo`** (`cycleKpi.ts`).

## Review target semantics (Metrio presets)

Legacy **Jira App** sidebar had a single **Target days for designer work time** field (no Team/Sprint/Org dropdown). UX KPI formulas are audited against vendored `docs/canonical-legacy/apps-script/Code.gs`.

| Filter | Scope | `targetReviewDays` |
|--------|--------|-------------------|
| Team target | direct reports | from Settings (`reportFilters.targetReviewDays`, default 3) |
| Sprint target | direct reports | **2** (fixed sprint SLA preset) |
| Org target | full Bamboo team | Settings value |

Employee: Personal → settings days; Sprint → 2 days; Quarter goal → settings days.

## Date range model

`PerformanceDateRange { from, to, preset }` — session-persisted; toolbar shows **From / To** + preset (Custom when edited manually).

## Remaining (Phase 11 scope)

- Lucide icon pass, `performanceHelp.ts`, Tooltip upgrade
- Recharts mini trend cards + hover
- Radix Select, focus-ring, badge polish, border reduction
- PDF metadata from explicit range + target label
- Packaged real-data 7d/30d/quarter verification
