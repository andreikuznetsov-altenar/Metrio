# Metrics Methodology V2 validation

Audit source: local read-only dashboard cache on 2026-10-16 (cache re-read after the app refreshed it at 12:20; Andrei's V2 completed count is therefore 28, one more than the first pass of this audit, which measured 27; the code was verified identical by re-running the original Metrics commit against the same cache). Re-run with `npx vite-node scripts/audit-metrics-methodology-v2.ts` and `npx vite-node scripts/audit-metrics-v2-reconciliation.ts`. Reporting range: 2026-07-16 through 2026-10-16. No Jira, Bamboo, release, or remote Git state was changed.

## Real-team before / after

Durations below are business-window elapsed hours. V1 durations are means; V2 durations are medians, so they are intentionally not directly interchangeable.

| Person | Completed V1 → V2 | First Pass V1 → V2 | Reworked cycles V2 | Backflow events V2 | Execution h mean → median | Cycle h mean → median | Legacy Efficiency | V2 replacement |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Andrei Kuznetsov | 59 → 28 | 53/59 (89.83%) → 27/28 (96.43%) | 1 | 0 in period | 164.16 → 9.42 | 1920.32 → 975.26 | 91 | Throughput 28 + primitive rates/durations |
| Daria Chernova | 29 → 29 | 28/29 (96.55%) → 28/29 (96.55%) | 1 | 3 | 14.45 → 0.33 | 194.45 → 19.59 | 98 | Throughput 29 + primitive rates/durations |
| Valeriia Pavlova | 21 → 17 | 17/21 (80.95%) → 14/17 (82.35%) | 3 | 7 | 430.20 → 3.76 | 675.99 → 28.11 | 89 | Throughput 17 + primitive rates/durations |
| Nikita | 6 → 6 | 5/6 (83.33%) → 5/6 (83.33%) | 1 | 0 in period | 114.60 → 16.93 | 172.18 → 26.25 | 91 | Throughput 6 + primitive rates/durations |
| Konstantin | 4 → 4 | 4/4 (100%) → 4/4 (100%) | 0 | 0 | 17.32 → 7.47 | 760.73 → 14.94 | 100 | Throughput 4 + primitive rates/durations |
| Team | 67 → 84 | 61/67 → 78/84 (92.86%) | 6 | 10 | 146.52 mean (legacy aggregate) → 2.65 | 1737.25 mean → 53.47 | 95 | Throughput 84 + primitive rates/durations |

The largest attribution change is Andrei's count: V1 credited many touched AGTC cycles to the current/person grouping, while V2 assigns each completion to the explicit cycle owner. Concrete multi-return examples include UX-5236 (3 qualifying events) and UX-5248, UX-5444, UX-5470, UX-5719, and UX-4082 (2 each). These demonstrate why reworked cycles and backflow events must remain separate.

## Acceptance cases

- Started-but-unfinished cycles remain visible in start semantics.
- Three qualifying returns in one cycle produce one reworked cycle and three events.
- Hold and CIT approval waiting are not rework.
- Review → active is rework.
- Cancellation is not completion.
- Reopen and recompletion create deterministic separate cycles.
- A long-tail duration does not dominate the primary median.
- Team issue lists dedupe reassigned/shared issues.
- Assignee changes split execution and determine cycle ownership.
- Mixed profiles combine primitive numerators/denominators, not profile scores.
- WSkins completion and downstream-return semantics remain explicit.

## Data limitations

- Jira status history measures workflow latency, not timesheet effort.
- Some older cached issues lack complete assignee history. Those outcomes are retained as unattributed fallback observations instead of being silently discarded.
- A completion observed without its start is counted, but excluded from duration samples.
- Public holidays and person-specific schedules are addressed by Capacity/Time V2, not this methodology pass.

## Rebase and cleanup validation (final pass)

### Person ↔ team reconciliation (real cache, 5-person team)

| Metric | Σ persons | Team | Reconciles |
| --- | ---: | ---: | --- |
| Completed cycles | 84 | 84 | yes |
| First-pass cycles | 78 | 78 | yes |
| Reworked cycles | 6 | 6 | yes |
| Backflow events (separate axis) | 10 | 10 | yes |

No completed cycle is owned by someone outside the team roster, so ownership semantics require (and achieve) exact reconciliation. Events (10) are deliberately *not* equal to reworked cycles (6): UX-5236 alone has 3 events. A synthetic regression test (`canonicalPerformanceMethodology.test.ts`) covers a multi-backflow cycle and a mid-cycle hand-over and asserts the same four identities.

### Andrei attribution (59 → 28)

Of the 76 KPI-eligible issues Andrei touched that have a completed cycle in the window, the V2 cycle owners are: Andrei 28, Daria 28, Valeriia 16, Nikita 3, Konstantin 1. V2 therefore credits Andrei with exactly the 28 cycles in which he had the largest hands-on execution segment; the other 48 completions belong to the teammate who did the work. The pre-V2 cache value of 59 credited him with additional touched cycles. His cycle count in the audit equals the production KPI (`consistent: true`).

### Duration distributions (team, completed cycles, hours, business window)

| Measure | n | min | median | mean | P75 | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Execution | 77 | 0.00 | 2.65 | 39.76 | 9.47 | 1588.94 |
| Cycle | 83 | 0.00 | 53.47 | 680.89 | 961.51 | 4384.31 |
| Review | 79 | 0.00 | 52.91 | 664.16 | 952.00 | 4362.02 |

84 completed cycles; 7 have no measurable execution segment (excluded from the execution sample), 1 has no start-to-completion cycle sample. The audit cross-checks these against the production KPI's n / median / mean (all three match). Medians and means differ by one to two orders of magnitude because of real long-lived tickets (e.g. UX-2198, UX-2302, UX-2309 opened in 2024 and closed 12-15 Oct 2026 in a backlog clean-up). That is exactly why the median is the primary statistic and the mean is diagnostic only. Values use the canonical Europe/Malta working calendar from Capacity/Time V2 and are byte-identical when the audit is run with host TZ set to UTC, Europe/Malta, America/New_York or Pacific/Auckland (before Capacity/Time V2 they drifted by up to ~0.3h in the median with the host timezone).

### Cache and persisted-field compatibility

`DASHBOARD_CACHE_SCHEMA_VERSION` is now 3. The issue-event flag `excludeFromEfficiencyBackflow` (the canonical review→hold backflow exclusion, misnamed) is renamed `excludeFromBackflow`; the only persisted copy is in the dashboard cache, which the version bump invalidates. A guard test (`metricsV2LegacyBoundary.test.ts`) fails if production code references `efficiencyIndex`, `backflowCount`, `teamEfficiency`/`canonicalTeamEfficiency*`, the old flag name, or an `efficiency` analytics metric.
