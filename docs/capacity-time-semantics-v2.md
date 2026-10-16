# Capacity and Time Semantics V2

## Working calendar

All analytical date and business-time accounting uses `WorkingCalendar` with an explicit IANA timezone. The deterministic product default is `Europe/Malta` (Altenar's headquarters timezone). No company-level analytical timezone setting exists: the existing `displayTimezone` preference only controls how timestamps are *shown* to a user and is deliberately not an analytical input. A future organisation setting can pass its IANA zone to `new WorkingCalendar({ timeZone })`.

Default schedule:

- Monday–Friday
- 09:00–17:00
- 8 scheduled hours per day
- no public/company holidays unless they are supplied explicitly

The calendar owns date keys, day boundaries, working-day decisions, business-window overlap, scheduled hours, leave overlap, holiday exclusion, and per-date scheduled-hour overrides for future part-time support. Machine timezone is never an analytical input.

Timezone-less legacy Jira/cache timestamps are interpreted as wall-clock times in the reporting timezone. Jira timestamps with `Z` or an explicit offset retain their stated instant.

## Root cause of timezone instability

The previous path mixed absolute Jira timestamps with host-local operations such as `new Date(year, month, day, hour)`, `getDay()`, and timezone-less date parsing. Consequently the same `09:00Z` event was clipped against a different 09:00–17:00 window under UTC, CEST, and America/New_York. Local-midnight report boundaries and snapshot buckets also moved with the host.

V2 converts reporting-calendar wall times to absolute instants through `Intl.DateTimeFormat` and an explicit IANA timezone. Date-only report boundaries, week starts, retention cutoffs, daily snapshots, and current-workload horizon dates share that calendar.

## Separate time concepts

| Concept | Function / use | Meaning |
| --- | --- | --- |
| Elapsed workflow time | ordinary timestamp subtraction where explicitly needed | Continuous wall-clock latency |
| Weekday elapsed latency | `getWeekdayElapsedDurationMs` | Full clock time on Monday–Friday; can count 24 hours per weekday |
| Business-window elapsed time | `getBusinessWindowDurationMs` / `WorkingCalendar.businessTimeOverlapMs` | Overlap with scheduled 09:00–17:00 windows |
| Estimated human effort | Current Workload V2 estimator | Forecast effort; not derived by relabeling elapsed time |

`getWorkingDurationMs` remains only as a deprecated compatibility alias for weekday elapsed latency. Performance execution and Historical load use the business-window function.

## Historical load formula

Historical load is a **historical execution-demand proxy**, not utilization, productivity, current workload, or timesheet hours.

Before:

`monthly quantity = completed cycles / calendar days × 30`

`estimated monthly hours = monthly quantity × average completed-cycle execution hours`

`historical capacity % = estimated monthly hours / 164 × 100`

V2:

`historical execution occupancy = union of attributed hands-on intervals inside the measured range`

`available scheduled hours = working-calendar hours in the measured range - reliable leave - supplied holidays`

`Historical load % = historical execution occupancy / available scheduled hours × 100`

Intervals are merged per person before measuring, so two simultaneous Jira issues cannot create more than one hour of occupancy in one clock hour. Sequential intervals add normally. Assignee-history intervals are intersected with hands-on status intervals. A current status without changelog evidence is not projected backward into a historical range.

The 164-hour constant remains only for an optional normalized monthly-equivalent display. It is not the denominator of the measured range.

## Denominator rules

- The denominator ends at the earlier of report end or the current reporting-calendar date.
- Partial months and multi-month ranges use their actual scheduled working days.
- Reliable leave ranges reduce the denominator.
- Supplied company/public holidays reduce both scheduled availability and business-window occupancy.
- Holidays are not guessed from employee country or location.
- Per-date scheduled hours can represent part-time or exceptional schedules.
- Missing historical leave coverage is reported as a limitation; absence is not invented.

## Saturation and bands

Because intervals are merged per person and clipped to the business window, merged occupancy can never exceed the available scheduled hours. Historical load therefore saturates at 100% by construction. The old extrapolation could report >100% only because it multiplied monthly throughput by average duration; that figure was an artefact, not evidence of over-capacity. Parallel Jira tasks are *occupancy* evidence; the estimated effort (*demand*) of those tasks is the separate Current Workload V2 estimate and is not mixed into this ratio.

Historical bands (<50 light, 50–85 balanced, 85–100 high) are analytical wording for Historical load only. They are never used as Current Workload badges: the employee "Current workload" card now shows the current-queue load percent and badge, and mentions Historical load only as a separately labelled tooltip figure.

## Team aggregation

Team Historical load is:

`sum(person execution occupancy) / sum(person available scheduled hours)`

It is never the average of person percentages. A ten-person team therefore contributes its full numerator and denominator rather than receiving the same weight as one person.

## Duration presentation

- Execution Time: business-window elapsed execution.
- Cycle Time: the Metrics V2 business-window contributor-cycle definition.
- Review Time: workflow latency, explicitly not hands-on effort.
- Primary operational durations remain medians; means are diagnostic.
- Labels distinguish business hours from elapsed workflow days.

## Cache decision

- Dashboard cache schema is version **4**. v3 was Metrics V2 (KPI shape without the legacy backflow counter / Efficiency score, `excludeFromBackflow` flag); v4 rejects cached `capacityLoadPercent` values produced by the old monthly-extrapolation formula and host-local calendar. Older caches are refetched.
- KPI snapshot schema is version **6**. Earlier day buckets and cycle sums used host-local boundaries or older metric semantics and are rebuilt from raw Jira history.
- Old and V2 Historical load percentages must not be joined into one continuous trend.

## Data limitations

- No company holiday feed is present in the current cache; default availability excludes weekends only. Public holidays are not guessed from employee location.
- The BambooHR time-off feed in the cache is forward-looking: for the audited team the only entries are 2026-10-30 and 2026-12-24 → 2027-01-04. Historical leave for July–September therefore cannot reduce the denominator, and the report states this instead of inventing availability. Historical load for people who were on leave earlier will read lower than their true availability-adjusted value until historical leave is captured.
- Today is counted as a full available day while only the elapsed part of it can contain execution; this slightly understates a range ending today.
- `getWeekdayElapsedDurationMs` (formerly `getWorkingDurationMs`) deliberately counts 24 clock hours per weekday and is used only for workflow latency (review/hold/waiting, task-journey stage age). Those values are formatted in elapsed days, never as business hours.
- Time-off ranges are applied only when supplied and matched reliably to the employee.
- Merged execution intervals are occupancy/demand evidence, not proof of hours worked.
- A missing changelog cannot establish historical status occupancy.

## Timezone test matrix

The same suite is run under `TZ=UTC`, `TZ=Europe/Malta` and `TZ=America/New_York`. New domain calculations assert absolute instants, so they cannot depend on the host zone. Host-local test inputs found while hardening (`new Date(y, m, d, h)` or timezone-less ISO strings parsed by `new Date`) were converted to explicit instants in: `currentEffortModel.test.ts`, `calendarPeriod.test.ts`, `digestIds.test.ts`.

The `pass155MOperationalWorkload` scenario places events at fixed `…T09:00:00.000Z` instants. The previous code clipped them against a host-local 09:00–17:00 window (`getHours()`/`new Date(y, m, d, h)`), so the same instants fell inside the window under UTC but 2 hours inside it under CEST, changing the measured active hours. With the reporting calendar the clip is always applied in Europe/Malta and the result is identical in every host zone.

The legacy Apps Script parity harness compares durations at one-second resolution: the legacy script treated a day end as 23:59:59.999 and lost 1 ms per crossed midnight.
