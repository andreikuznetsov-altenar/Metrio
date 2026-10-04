# Executive demo data checklist

Use this list before an executive walkthrough. Metrio does not auto-clean production data; fix items manually in Jira, BambooHR, Goals, Feedback, and local preferences.

## Goals and reviews

- Goal titles that are placeholders (for example a single digit `1`) — rename to outcome-oriented titles in Goals.
- Goal review cards with no active review cycle — hide or complete stale review states in admin tooling.
- Empty goal descriptions shown in drawers — add one-line intent per goal.

## Feedback

- Dummy or test survey names visible in Feedback — archive or delete test cycles in survey admin.
- Disconnected Google panels with stale error copy — reconnect or clear failed OAuth state in Settings → Diagnostics.

## Notifications

- Test notification history (`metrio-notification-events` experiments) — clear local notification store or use a fresh profile.
- Bell badge counts that do not match visible unread items — mark read or reset fixture data.

## Performance / analytics

- Person KPI counts that cannot be explained from visible Jira issues — refresh report after attribution fixes; verify hire/transfer dates in BambooHR.
- Placeholder cycle names in exports — regenerate after Jira summary cleanup.
- Historical snapshots with aggregate-only KPIs — note period in the brief; avoid opening task drilldown for those dates.

## Connections

- Stale “Failed” diagnostics when credentials are valid — run Diagnostics → Re-check connections.
- Confluence shown as independently “Connected” — expected label is **Available via Jira** when only Jira session is used.

## Onboarding

- New starter rows with `0 of 0` steps — ensure Bamboo checklist signals and hire dates are present.
- Generic “BambooHR onboarding” redacted items — complete real tasks in BambooHR for demo accounts.

## Safe local cleanup (dev / demo machine)

1. Quit Metrio.
2. Optional: reset visual fixture keys in browser devtools (`metrio-dev-fixture`, `metrio-visual-preferences`) if using fixtures.
3. Reconnect from the Connection screen with production-like credentials.
4. Run a full Performance refresh from the dashboard banner.
5. Re-open Home and verify Team Actions, digests, and analytics drilldowns reconcile.
