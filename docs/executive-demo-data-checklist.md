# Executive demo data checklist

Use this list before an executive walkthrough. **Metrio does not auto-clean production data**; fix items manually in Jira, BambooHR, Goals, Feedback, local storage, and Settings.

## Goals and reviews

| Issue | Where it appears | Why it hurts | Safe cleanup |
|-------|------------------|--------------|--------------|
| Placeholder titles (e.g. `1`) | Goals list, Home goals card, exports | Looks unfinished / test data | Rename or delete in **Performance → Goals** (or employee Goals view). |
| Stale review states | Goal drawers, review reminders | Confusing “action required” | Complete or reschedule review dates on real goals. |
| Empty descriptions | Goal detail drawer | Weak narrative in demo | Add one-line outcome per showcased goal. |

**Optional realistic example:** One active goal with a clear title, owner, review date in the next 30 days, and 1–2 linked Jira keys — create manually; do not use automated seeding in production.

## Feedback

| Issue | Where it appears | Why it hurts | Safe cleanup |
|-------|------------------|--------------|--------------|
| Test survey / cycle names | Feedback → History, Cycles | Obvious QA labels | Archive cycles or rename in Feedback admin / local survey store. |
| Dummy cycles with no runs | Cycles tab | “Scheduler creates draft…” hint dominates | Pause/archive unused cycles; keep one **Team pulse** with a completed or in-progress run for demo. |
| Stale Google OAuth errors | Feedback Survey tab | Undermines “connected” story | **Settings → Connections** reconnect Google; run Diagnostics re-check. |

**Optional demo state (manual only):** One pulse cycle (monthly), one survey titled for the team (e.g. “Design collaboration pulse”), 5–12 recipients with valid work emails, delivery sent with partial responses — configure in Feedback UI; do not auto-create.

## Notifications

| Issue | Where it appears | Why it hurts | Safe cleanup |
|-------|------------------|--------------|--------------|
| Old failure + restored + warning stack | Notification Center | Looks unstable | Mark read or clear local history (below). |
| Test / fixture event text | Bell list | Breaks trust | Clear `metrio-notification-events` on demo machine only. |
| Badge count mismatch | Header bell | Distracting | Refresh app; mark all read from drawer. |

### Clear Notification Center history safely (no Jira changes)

1. Quit Metrio.
2. On the **demo Mac only**, remove or reset local notification storage:
   - DevTools → Application → Local Storage → delete key `metrio-notification-events`, **or**
   - Terminal: clear app local storage via a fresh user profile / reinstall if policy allows.
3. Relaunch Metrio and trigger a fresh Performance refresh so new actionable items are real.
4. Do **not** delete Jira issues or Bamboo records to “clean” notifications.

## Performance / analytics

| Issue | Where it appears | Why it hurts | Safe cleanup |
|-------|------------------|--------------|--------------|
| KPI vs empty drilldown | Analytics drawer | Trust issue (see `docs/kpi-trust-root-cause.md`) | Refresh performance; avoid opening drilldown on aggregate-only periods. |
| Fixture-looking Jira titles | People, Delivery Risk | “Lorem” effect | Use real project keys in demo environment. |
| `0 of 0` onboarding steps | Home new starters | Broken people story | Fix hire dates / Bamboo checklist in BambooHR. |

## Connections

| Issue | Where it appears | Why it hurts | Safe cleanup |
|-------|------------------|--------------|--------------|
| Stale “Failed” diagnostics | Settings → Diagnostics | Suggests outage | **Re-check connections** after valid credentials. |
| Confluence “Connected” wording | Diagnostics | Misleading | Expect **Available via Jira** when only Jira session backs search. |
| Old failure notifications | Notification Center | Noise before demo | Clear notification history (above); reconnect once. |

## Onboarding & resources

| Issue | Where it appears | Why it hurts | Safe cleanup |
|-------|------------------|--------------|--------------|
| Empty resource library | Home → Resources | Dead end | Add Confluence links in company config / matched onboarding resources. |
| Plain Bamboo redacted rows | Manager new starters | Looks broken | Complete BambooHR onboarding tasks for demo accounts. |

## Safe local cleanup (dev / demo machine)

1. Quit Metrio.
2. Optional: reset fixture keys (`metrio-dev-fixture`, `metrio-visual-preferences`, `metrio-visual-survey-data`) if you were using visual fixtures — **not** on a production user daily driver.
3. Reconnect from Connection screen with production-like credentials.
4. Run full **Performance refresh** from the dashboard banner.
5. Re-open Home; verify Team Actions, digests, and one analytics drilldown reconcile.
6. Open Feedback with Google connected; confirm one cycle card shows **Active** / **Monthly** (not raw enums).

## Before the room

- [ ] Notification history reviewed or cleared locally  
- [ ] No placeholder goal titled `1`  
- [ ] Feedback cycles human-readable; at most one highlighted pulse  
- [ ] Diagnostics green or honestly labeled (Confluence via Jira)  
- [ ] Dark mode spot-check on Performance Overview and Feedback Survey  
