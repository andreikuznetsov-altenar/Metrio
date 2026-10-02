# Notification Center — Phase 14 audit (baseline `124c6e9`)

## 1. Event types (pre–Phase 14)

| Legacy type | Generated in | Native macOS alert | Settings toggle |
|-------------|--------------|-------------------|-----------------|
| `workload_change` | `processNotificationTransitions` when workload transitions into `high` or `overloaded` | Yes, if `workloadAlerts` | Workload changes |
| `upcoming_time_off` | Vacation start (`on_vacation`) and vacation reminder (`vacation_soon` / `vacation_tomorrow`) | Yes, per `vacationStarts` / `vacationReminder` | Vacation starting soon / Vacation reminders |
| `returns` | `returns_today` availability | Yes, if `returns` | Return from time off |
| `problematic_task` | Problematic task count increases | Yes, if `problematicTaskAlerts` | Problematic tasks |
| `task_attention` | Issue health transitions to `problematic` | Yes, if `problematicTaskAlerts` | Problematic tasks |

No `integration_problem` or `availability_change` events existed before Phase 14.

## 2. Generation pipeline

1. Performance data refresh completes (`PerformanceDataProvider` → `fetchPerformanceData`).
2. `applyPerformanceRefreshSideEffects` updates tray, then calls `processNotificationTransitions(persons, prefs, reportParams)`.
3. Updated `notificationState` and sync timestamps are persisted via `savePreferences`.
4. Background: `registerCoalescedBackgroundRefresh` coalesces Tauri `background-jira-refresh`, `background-bamboo-refresh`, and debounced `system-resumed` into the same performance `refresh()` path, so notifications can fire while the app runs in the menu bar (same cadence as existing host emitters — no new polling loop).

## 3. Native vs in-app (pre–Phase 14)

- **Native:** `@tauri-apps/plugin-notification` (`sendNotification`) when OS permission is granted **and** the category toggle is on.
- **In-app:** `recordNotificationEvent` → `localStorage` key `metrio-notification-events`.
- **Gap (fixed in Phase 14):** If notification permission was denied, `processNotificationTransitions` returned early and **skipped in-app recording entirely**.

## 4. Deduplication (pre–Phase 14)

- **Transition state:** `prefs.notificationState` (`workloadLevels`, `vacationNotified`, `problematicCounts`) prevents repeated transitions on refresh/restart for the same person/issue state.
- **Event store:** `recordNotificationEvent` rejected any new event whose `dedupeKey` already existed in history — this blocked legitimate re-notification after state recovery (Phase 14 removes history-based dedupe; transitions remain authoritative).

## 5. Navigation (pre–Phase 14)

- String `navigationTarget`, e.g. `person:{id}`.
- `AppLayout` handled only `person:` prefix via `metrio-open-person` custom event.
- Task events pointed at person drawer, not Jira.

## 6. Persistence

- Browser `localStorage`, max **50** events (Phase 14 → **100**), newest first, drop oldest.
- `readAt` ISO timestamp for read state.
- Loaded synchronously on shell mount for bell count; sidebar refreshes when opened.

## 7. Read / unread

- Unread = no `readAt`.
- Opening sidebar did **not** auto-mark all read (unchanged).
- Clicking an event marked it read, then navigated if `navigationTarget` set.

## 8. UI (pre–Phase 14)

- Bell dot (not numeric), drawer list, Lucide icons, relative time via `date-fns` `formatDistanceToNow`, “Mark all as read”, no filters, no grouping, no clear history, no avatars.

## Phase 14 product decisions

1. **Canonical types:** `task_attention`, `workload_change`, `vacation_upcoming`, `vacation_reminder`, `vacation_return`, `availability_change` (reserved), `integration_problem`.
2. **Explicit `target` object** replaces `navigationTarget` strings (legacy migrated on read).
3. **In-app history** is recorded for meaningful transitions even when native permission is off or a macOS toggle is off; Settings switches label clarifies they control **macOS alerts only**.
4. **Task attention:** row click opens Jira issue; optional person affordance opens person drawer.
5. **Integration events** on healthy ↔ unhealthy transitions (sync stale flags), not on every failed poll.
