# Capacity and Time V2 validation

Read-only audit source: local dashboard cache, period 2026-07-16 through 2026-10-16. Default analytical timezone: Europe/Malta. Public holidays were not available and were not guessed.

| Person | Execution business h | Available h | Availability-adjusted h | Completed samples | Old formula % | V2 direct % | Material reason |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Andrei Kuznetsov | 0.0 | 536 | 536 | 1 | 0.0 | 0.0 | The tiny legacy sample has no attributable hands-on occupancy after ownership intersection |
| Daria Chernova | 252.5 | 536 | 536 | 25 | 15.5 | 47.1 | Direct in-period occupancy includes attributable hands-on intervals rather than throughput × average completion duration |
| Valeriia Pavlova | 265.2 | 536 | 536 | 18 | 44.1 | 49.5 | Direct numerator removes monthly extrapolation and uses actual 67 scheduled weekdays |
| Nikita Utkin | 89.7 | 536 | 536 | 6 | 17.6 | 16.7 | Direct ratio is close but uses the real range denominator |
| Konstantin Zhuikov | 15.9 | 536 | 536 | 2 | 3.1 | 3.0 | Direct ratio is close but uses the real range denominator |

**Valeriia Pavlova.** The old 44.1% came from `monthly throughput × mean cycle execution hours / 164`: 18 completed samples over 93 calendar days extrapolated to a 30-day month and multiplied by the mean completion duration, so one long cycle moved it a lot. The direct measurement is 265.2 merged hands-on business hours over 536 available hours = 49.5% (≈81 h per 164-hour month). The methodology was not tuned to reproduce 44.1%; the rise is the removal of extrapolation plus the direct numerator, and the figure is occupancy of at least one active issue, not hours worked.

**Daria Chernova.** 15.5% → 47.1% is the largest change. Her 25 completed in-period cycles contain only 78.8 business hours of hands-on time (≈3.2 h each), which the old formula scaled to 25.4 h/month. Directly measuring her attributed hands-on occupancy in the range gives 252.5 h, so ~174 h of in-period hands-on time belongs to issues whose cycles are not counted as completed in the period (work that moved on to review/hold, was cancelled, or completed outside the window). The old formula could not see that time at all. She has no currently active segment.

**Valeriia reconciliation.** Completed-cycle hours 224.3 (12.5 h average × 18 cycles) → old 44.1%; direct occupancy 265.2 h (the extra ~41 h is hands-on time in the range that does not belong to completed in-period cycles, including her current active segment of 9.3 h).

The audit output is byte-identical when run under `TZ=UTC`, `TZ=Europe/Malta` and `TZ=America/New_York`.

The cached BambooHR time-off feed only contains forward-looking entries for this team (2026-10-30 and 2026-12-24 → 2027-01-04), so no leave overlaps the audited range.

No reliable overlapping leave records were present for these five people in this cache, so scheduled and availability-adjusted hours are equal. The audit script is [audit-capacity-time-v2.ts](../scripts/audit-capacity-time-v2.ts).

## Automated acceptance coverage

- explicit reporting timezone independent of OS timezone
- DST weekend boundary
- weekend, before-workday, after-workday, same-day, and overnight clipping
- no negative duration
- leave and supplied-holiday denominator reduction
- partial reporting ranges and per-date part-time hours
- parallel interval merging and sequential interval summing
- assignee ownership intersection
- direct Historical load ratio
- numerator/denominator-weighted team aggregation
- Current Workload remains independent from Historical load

## Post-rebase verification (on top of Workload V2 and Metrics V2)

- Audit output of `audit-capacity-time-v2.ts` is byte-identical for host `TZ` = UTC, Europe/Malta, America/New_York and Pacific/Auckland, and reproduces the table above exactly after the rebase. The Metrics V2 audits are likewise byte-identical across those zones.
- Andrei's 0.0 h is consistent with Metrics V2: his 28 owned completions are almost all old tickets closed in Oct 2026 (e.g. UX-2962 was In Progress 2025-07-25 → 2026-04-29, before the window), so there is no in-window hands-on occupancy even though the completions count toward Throughput.
- What-if on real data (not stored; no leave exists in the window): 10 working days of leave for Daria reduce her denominator 536 h → 456 h (47.1 % → 55.4 %); a weekend-only leave range changes nothing.
