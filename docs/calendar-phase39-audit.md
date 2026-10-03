# Phase 39 — Calendar provider audit

## Corporate environment

Metrio desktop targets **Google Workspace** for Feedback (Forms, Gmail, Drive). **Microsoft 365 is not implemented** in this phase — no speculative multi-provider support.

## Chosen provider: Google Calendar (read-only)

| Criterion | Assessment |
|-----------|------------|
| Existing Google OAuth | Yes — PKCE loopback in `src-tauri/src/api/google/oauth.rs` |
| Add Calendar without breaking Forms/Gmail | Yes — **incremental consent** with `include_granted_scopes=true` |
| Read-only | `https://www.googleapis.com/auth/calendar.events.readonly` |
| User consent | Separate **Enable Calendar access** action — not bundled into default Feedback connect |

## Scope policy

- **Default OAuth** (Feedback): unchanged — forms, gmail.send, drive.file (see `GOOGLE_OAUTH_SCOPES`).
- **Calendar**: optional second consent via `google_oauth_enable_calendar`.
- Disconnect Google removes Calendar access with existing `google_disconnect`.

## Data minimization

- Fetch window: **now → +7 days** only.
- Persist: short-lived in-memory + session cache (≤30 min), no long-term calendar archive.
- **Description field not stored** — only title, times, attendees (email), links, conference join URL.

## Not used for performance

Meeting frequency, attendance counts, and calendar patterns are **not** fed into KPI, Radar, or rankings.
