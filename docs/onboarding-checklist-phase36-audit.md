# Phase 36 — Onboarding checklist storage & sources

## Goal

Curated onboarding checklist with **provable** completion only. Operational support — not performance KPIs.

## Config source (Phase 26)

- Checklist **definitions** live in `src/config/onboardingChecklistDefinitions.ts` (versioned, not React-hardcoded).
- Resource **open targets** reuse `CURATED_ONBOARDING_RESOURCES` / `matchOnboardingResources` (Phase 23 knowledge links for Confluence — no new Confluence client).

## Completion sources

| Mode | Proof |
|------|--------|
| `manual` | User mark complete + timestamp in local store (undo clears). |
| `bamboo_api` | No pending `bamboo_onboarding_action` inbox signals after Bamboo sync; never inferred from login. |
| `jira_api` | Resolved Jira identity on person snapshot (`jira.accountId`). |
| `confluence_explicit` | Same as manual — API does not prove read. |
| `feedback_state` | Feedback run recipient `respondedAt` for configured template / onboarding cycle. |

Document-specific Bamboo items are **not** shipped — Phase 21 did not document a stable per-document API in Metrio.

## Storage (Phase 34 pattern)

- **No shared backend** — same as goals/surveys: `onboarding_checklist_data.json` in Tauri app data.
- Keyed by **Bamboo employee id** (`accountKey`) so logout/login on same machine does not leak manual state between people.
- Manager visibility on another device requires future shared API; UI shows progress only from **recomputed checklist** for authorized direct reports on this install (manual state is per account on this device).

## Bamboo / Jira refresh

- Checklist evaluation runs on performance refresh / Home load — **no dedicated Bamboo poller**.
- Uses existing `prefs.sync.bambooStale` / Jira person snapshot.

## Privacy

- Manager view uses `redactManagerChecklistItem` — generic Bamboo labels, no private document titles from employee inbox.

## Reminders

- `onboarding_step_due` / `onboarding_feedback_due` via deduped inbox events (due day + 3 days after), not daily spam per item.
