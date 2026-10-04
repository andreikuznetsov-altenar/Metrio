# BambooHR employee photo audit

**Baseline:** `origin/main` at PHOTO pass start (`5efddd3`).

## Bamboo employee identifier

- **Canonical HR id:** `ResolvedEmployee.id` from Bamboo list/detail (`BambooEmployeeRecord.id`), stored on `Person.bamboo.id`.
- **Metrio person id:** `Person.id` — stable in-app key (fixture keys like `person-01` or Bamboo id in production team builds). **Not** used for Bamboo photo API calls.
- **Jira identity:** `Person.jira.accountId` / `canonicalKey` — separate from Bamboo photo.

## Employee list payload

- `orgResolver` requests fields: `workEmail`, `supervisorEId`, `jobTitle`, `displayName`, names, `status`, `hireDate`, `department`.
- **No `photoUrl`** (or equivalent) in the normalized employee model today.
- **Strategy:** **B** — dedicated Bamboo photo endpoint per employee id.

## Native photo API (existing)

- Tauri command: `bamboo_get_employee_photo`
- Path: `/employees/{employeeId}/photo/{size}` where `size` is `small` (~50px) or `medium` (~150px).
- Response: `BambooPhotoPayload { content_type, data_base64 }` — binary fetched server-side with stored Bamboo token (not exposed to the webview).
- Errors: HTTP status surfaced via `ApiError.status` (404 missing photo, 403 permission, 5xx transient).

## Frontend loading (target)

- **Single service:** `bambooAvatarService` — invoke, in-memory bounded cache, inflight dedupe, optional visual fixtures.
- **Session:** Bamboo subdomain resolved once per session; cleared on logout / account reset.
- **Person directory:** `personDirectory` maps Metrio `personId` → `bambooEmployeeId` + display name when performance/home data loads.
- **UI:** `PersonAvatar` only — screens pass `person` and/or `personId`; they do not build Bamboo URLs or call `invoke` directly.

## Fallback

- Priority: valid cached/fetched photo → initials (`getInitials`).
- `img` `onError` → initials; no broken-image icon.
- Missing photo (404), forbidden (403), and network failures are cached appropriately; no toasts or Notification Center events.

## Permissions

- Photos are fetched with the same Bamboo API credentials as other Metrio Bamboo calls.
- No bypass of Bamboo authorization; no sync of photo binaries to Metrio backend.

## Prior audit issues (fixed in PHOTO pass)

- Several screens passed **Metrio `personId`** into `employeeId`, causing wrong or empty photo fetches (`PersonIdentityHeader`, `NotificationCenter`, People/Overview/Radar tables, analytics rows).
- Avatar cache and subdomain were not cleared on **logout**.
- `PersonAvatar` called `loadPreferences()` on every mount.
- Size tokens: `lg` was smaller than `md` in CSS.

## PersonAvatar usages (inventory)

| Surface | Component |
|--------|-----------|
| Dashboard new starters | `HomePage` |
| Team overview attention | `TeamOverviewView` |
| People table | `TeamPeopleView` |
| Radar | `TeamRadarView` |
| Upcoming availability | `TeamUpcomingAvailabilitySection` |
| Analytics issue rows | `AnalyticsIssueRow` |
| Person drawer / brief header | `PersonIdentityHeader` |
| Notifications (person events) | `NotificationCenter` |
| Dashboard team actions | `ActionQueueSection` (dashboard variant) |
| Calendar 1:1 | `HomeUpcomingMeetings` |

Feedback recipients remain name-only (Jira reporter identity; no stable Metrio `Person` on row).

## Visual / CI

- Playwright uses `VITE_VISUAL_FIXTURE=1` and `personAvatarVisualFixture` — deterministic data URLs, no production Bamboo images.
