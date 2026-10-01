# UI recovery — Phase 8 audit

**Baseline SHA:** `894f50609ade5d472075b17cc527a767608f3009`  
**Phase 8 status:** Implemented (see git HEAD after commit)  
**Reference:** Jira App (read-only), packaged Metrio screenshots (user-provided)

| Problem | Status | Notes |
|---------|--------|-------|
| Duplicate global shell CSS | **Fixed** | Foundation `foundation-*` namespace; `shellCssOwnership.test.ts` |
| Header balance | **Fixed** | Nav flex, actions `margin-left: auto` |
| Toolbar polish | **Fixed** | Select chevron, export icon, refresh spin |
| KPI secondary lines | **Fixed** | `metricContextFromComparison` on summary cards |
| Trend sparklines (all 4) | **Fixed** | `performanceViewModel.ts` + `sparklineSeries.ts` |
| Trend semantics | **Fixed** | `TrendValue.tsx` |
| Team Attention density | **Fixed** | 64px rows, severity vs neutral issue keys, top 5 + Radar link |
| Workload table | **Fixed** | Badges, hover, At risk tooltip |
| At risk vs Radar | **Documented** | Tooltip only; formulas unchanged |
| Time off empty | **Fixed** | Compact empty state |
| Secondary tabs polish | **Fixed** | People / Radar / Delivery Risk tables |
| Scrollbar | **Fixed** | `ScrollArea.css` |
| Dark connection badge | **Fixed** | Semantic tokens |
| Visual regression suite | **Fixed** | `npm run test:visual`, `VITE_VISUAL_FIXTURE=1` harness |

## At risk semantics (verified)

- **Team workload “At risk”** = count of active issues with task-health status `at_risk` (`personAtRiskCount`).
- **Team Attention / Radar** = broader signals (stale issues, vacation risk, overloaded workload, etc.) via `buildTeamRadar`.

These can diverge by design; UI adds tooltip: “Active tasks flagged at risk by cycle-time rules” on the workload column.

## Visual tests

- Harness: `src/fixtures/performanceFetchFixture.ts` (dynamic import from `performanceDataService` only when `VITE_VISUAL_FIXTURE=1`).
- Snapshots: `e2e/visual/__screenshots__/metrio.spec.ts/*.png`.
- Scripts: `npm run test:visual`, `npm run test:visual:update`.
