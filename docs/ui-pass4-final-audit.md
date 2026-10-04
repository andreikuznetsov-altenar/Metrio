# UI Pass 4 — Final audit (Pass 4E)

Baseline SHA (4D): `35dba217c8ec3589e65e0ae12d87fa3514dba6e6`

Status legend: **PASS** — met in codebase at audit time · **FIXED IN THIS PASS** — adjusted in 4E · **NOT APPLICABLE** — out of product scope or internal-only identifier

| # | Requirement (UI Pass 4A–4D) | Status | Notes / primary location |
|---|-----------------------------|--------|---------------------------|
| 1 | Main navigation uses **Dashboard**, not Home | PASS | `MetrioAppHeader.tsx` NAV_ITEMS |
| 2 | Remove redundant page-title bars (Dashboard, Performance, Feedback, Settings) | FIXED IN THIS PASS | `AppLayout.tsx` — only `PerformanceToolbar` when team/employee performance filters apply |
| 3 | User-facing copy says **Dashboard** where the home surface is meant | FIXED IN THIS PASS | `HomePage.tsx`, `CalendarSettingsPanel.tsx`, `OperationalRulesSettingsPanel.tsx`, `notificationActionLabel.ts` |
| 4 | Standard content blocks use shared surface / border / radius / padding | PASS | `home-card`, `settings-card`, `notification-center__card`, goal cards |
| 5 | User CTAs use `Button` / `IconButton`, not bare text links (Jira keys may stay inline) | PASS | Notifications, Feedback, Settings; Jira keys: `performance-entity-link`, `home-link-list` assignment rows |
| 6 | Button groups use **8px** gap | PASS | `--space-2` / `settings-button-group`, Feedback disconnected actions |
| 7 | Standard “open/view/test” actions use **secondary** bordered buttons | PASS | `NotificationCenter`, Goals, Connections, Command Palette footer unchanged |
| 8 | Forms use shared `Input` / `Select` (no native leak) | PASS | Settings, Goals drawer, Apps Script drawer, Search palette |
| 9 | Toggles: thumb inside track, grouped blocks with surface/border | PASS | Preferences, Profile theme, Radix switch styles |
| 10 | Person Overview / Work / History / Brief — one drawer family, no stacked overlays | PASS | Person drawer + brief pattern from 4B |
| 11 | Notifications: source tabs only, overflow menu, cards, unread border, unread-first, secondary CTAs, one leading visual | PASS | `NotificationCenter.tsx`, `notificationInboxDisplay.ts` |
| 12 | Delivery Risk: stable columns, clickable issue key, description column | PASS | `TeamDeliveryRiskView.tsx` |
| 13 | Goals: description, centered empty state, create above list, rows, Open goal, structured drawer, status badge, search | PASS | `ManagerGoalsView.tsx`, `GoalDetailDrawer.tsx` |
| 14 | Settings: Theme in Profile only; Preferences; Attention rules; Vacation + Team actions; Company & App; Connections + Google instructions | PASS | `SettingsPage.tsx`, `ProfileMenu.tsx`, `GoogleConnectionPanel.tsx` |
| 15 | Dashboard: time-aware greeting, Refresh row, no MY WORK / TEAM labels, digest cards, My Focus / Team Actions structure | PASS | `HomePage.tsx`, `home.css` |
| 16 | Search: top sheet, no dim backdrop, icon right, no input focus ring, animation | PASS | `CommandPalette.tsx`, `command-palette.css` |
| 17 | Feedback: Survey visible without Google; disconnected placeholder; Connect; Setup instructions | FIXED IN THIS PASS | `buildEffectiveConfig.ts` (decouple Feedback nav from Google); `FeedbackPage.tsx` |
| 18 | Toasts: at most **one** visible; newest replaces previous | PASS | `ToastContext.tsx` (max 1 stack) |
| 19 | Dark mode parity on high-risk surfaces | PASS | Visual specs: `search-dark`, `notifications-dark`, `feedback-disconnected-dark`, etc. |
| 20 | Navigation targets work (Dashboard, Jira, person, goal, Bamboo, Feedback, palette) | PASS | `notificationNavigation.ts`, `actionNavigation.ts`, e2e interaction tests |
| 21 | No extra full Jira/Bamboo refetch when opening drawers / Search / Notifications | PASS | `uiNavigationRequestCount.test.tsx`, person drawer request tests |
| 22 | Profile menu: theme control lives in Profile (not Settings Preferences) | PASS | `ProfileMenu.tsx`, Preferences panel excludes theme |
| 23 | Company & App + operational rules cards in Settings | PASS | `CompanyAppSettingsPanel.tsx`, `OperationalRulesSettingsPanel.tsx` |
| 24 | Google Apps Script documented as legacy in Connections / Feedback instructions | PASS | `GoogleConnectionPanel.tsx`, `FeedbackGoogleSetupInstructions.tsx` |
| 25 | Bell notification count optically centered | PASS | `AppHeader.css` `.app-header__bell-badge` flex center |
| 26 | Command Palette keyboard + click-outside close without modal dim | PASS | `CommandPalette.tsx` |
| 27 | Clear-all notifications reconciles tray Jira unread | PASS | `clearActionInboxHistory` in `inboxReadSync.ts` |
| 28 | Internal route id `home` retained for routing/tests | NOT APPLICABLE | `AppRoute` type; not user-facing |
| 29 | Automated regression + visual coverage for Pass 4 surfaces | PASS | `uiPass4D.test.tsx`, `e2e/visual/metrio.spec.ts` |

## 4E manual QA matrix (recommended)

| Viewport | Screens |
|----------|---------|
| 1280×800 | Dashboard, Delivery Risk, Goals, Settings → Connections |
| 1440×900 | Person Overview / Work / History, Notifications, Search |
| 1728×1117 | Person Brief, Feedback disconnected + instructions, dark theme spot-check |

## Test gate (4E)

Run before review DMG:

- `npm test`
- `npm run test:backend`
- `npm run build`
- `npm run test:visual`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
