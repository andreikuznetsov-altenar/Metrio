# Phase 32 — Daily brief & weekly digest semantics

## Calendar week

- **Local Monday 00:00 → now** (`getCurrentWeekRange`) defines “this week” for weekly digests.
- Week identity: `YYYY-MM-DD` of the Monday that starts the week (`getLocalWeekKey`).
- Not mixed with rolling 7-day windows in user-facing copy.

## Daily brief

- **One identity per local calendar day** (`getLocalDateKey`) and role variant (`employee` | `manager` | `director`).
- Comparison baseline: **since your previous daily brief** — metrics from the last stored `DigestMetrics` snapshot (not “since midnight” or “since yesterday”).
- Monday: if the previous brief was Friday (or earlier), deltas cover the whole gap (weekend included in data, not spam notifications on Sat/Sun).

## Generation schedule

- No high-frequency poller. Digests are evaluated on **performance refresh side effects** (app open / coalesced refresh / background refresh registration).
- First relevant run of the local day/week builds or updates the current digest.
- Native notifications: **off by default**; optional via Settings.

## Weekend

- Digests are not pushed natively on weekends unless the user opens the app (refresh runs) and preferences allow notifications.
- Content remains available when the app is opened.

## Tray

- Numeric tray badge unchanged (unread Jira assignments only).
- Optional tray menu entry may link to today’s brief without changing the count.

## History

- Last **7** daily and **8** weekly digests retained in preferences (`digestState.history`).
