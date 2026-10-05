# Executive demo visual acceptance

**Baseline (Pass 6F):** `c7e2af6` (pre-6F) → **harness green SHA:** `de386e5f930e1e006fb82a97bac8e9113edc7777`  
**Prior acceptance SHA:** `e778c67` (DS final hardening)  
**Acceptance harness:** `e2e/visual/executive-acceptance.spec.ts` + `e2e/visual/visualBoot.ts`  
**Primary viewport:** 1440×900  
**High-risk viewports:** 1280×800, 1728×1117 (dashboard, performance overview, delivery risk, notifications)  
**Screenshots:** `e2e/visual/__screenshots__/executive-acceptance.spec.ts/`  
**Review date:** 2026-10-05 (post–6C/6D/6E/6A.1 + Pass 6F harness)  
**Method:** Automated harness green + spot PNG review (full manual re-walk still required)

## Readiness summary

| Criterion | Result |
|-----------|--------|
| BLOCKER issues open | 0 |
| HIGH issues open | 0 |
| Obvious broken layout | No |
| Contradictory KPI on reviewed analytics drawers | No |
| Raw machine UI on reviewed screens | No |
| Primary CTAs visually present | Yes |
| Design-system enforcement gaps (imports, card radius, token fallbacks) | Closed in hardening pass |
| **READY FOR EXECUTIVE DEMO** | **NO** (await post-6F manual screenshot sign-off) |
| **READY FOR NOTARIZATION** | **NO** (out of scope) |

## Scores (/10)

| Dimension | Score | Deductions |
|-----------|-------|------------|
| Visual consistency | 8 | Fixture **Offline** chip; **Dev fixtures** in profile menu; feedback question chrome now canonical IconButton |
| Information hierarchy | 8 | Home digest subtitle shortened; grid `minmax(0,1fr)` on digest row |
| Data trust | 9 | KPI/drawer copy aligned on sampled analytics |
| Navigation clarity | 9 | Global nav, settings sections, feedback tabs coherent |
| Empty states | 9 | Connection helpers use **secondary** buttons; feedback disconnected intentional |
| **Executive demo readiness** | **8** | Manual Bamboo photo QA still outstanding; demo data checklist |

## Screens reviewed (1440×900 + dark subset)

All **40** primary executive captures + **8** viewport variants + **11** dark subset = **59** PNGs in harness (re-reviewed after DS hardening).

| Area | Captures | Review notes |
|------|----------|--------------|
| Dashboard | 01–03, dark-01 | Weekly digest copy fits narrow column; team brief + digest readable |
| Performance | 04–07, radar, analytics 15–18 | Delivery risk table row height stable; team actions grid OK |
| People / person | 05, 11–14, dark-11/14 | Person brief cards use card radius tokens |
| Goals | 08–10, dark-09 | Empty + populated + drawer |
| Digest / notifications / search | 19–21, dark-20/21 | Notifications card radius consistent |
| Feedback | 22–28, dark-25 | Survey editor uses IconButton; cycles cards `--radius-card` |
| Settings / diagnostics | 29–33, dark-30/33 | Grouped cards; connections secondary helpers |
| Onboarding / cockpit / deps / calendar | 34–38 | No new truncation flagged |
| Connection / profile | 39–40 | API token helpers framed as secondary buttons |

## Issue log

| ID | Screen | Severity | Problem | Status |
|----|--------|----------|---------|--------|
| EVA-001 | Dashboard, Performance | HIGH | 「1 tasks in Review」 | **Fixed** (5G) |
| EVA-002 | Project cockpit | HIGH | Period label missing | **Fixed** (5G) |
| EVA-003 | Performance overview | HIGH | Team actions broken row | **Fixed** (5G) |
| EVA-004 | Global header | POLISH | **Offline** with fixtures | Open (demo machine) |
| EVA-005 | Profile menu | POLISH | **Dev fixtures** visible | Open (fixture mode) |
| EVA-006 | Demo data | MEDIUM | Placeholder titles | Open (checklist) |
| EVA-007 | Weekly digest card | POLISH | Subtitle truncation | **Fixed** — shorter copy + `minmax(0,1fr)` + `overflow-wrap` |
| EVA-008 | Feedback survey editor | MEDIUM | Local 28×28 icon buttons | **Fixed** — canonical `IconButton` |
| EVA-009 | Initial connection | MEDIUM | Ghost helper links | **Fixed** — `variant="secondary"` |

## Zero-tolerance scan (reviewed set)

| Check | Result |
|-------|--------|
| Word-by-word wrapping | None flagged |
| Clipped primary copy | None after EVA-007 |
| Raw enums in UI | Not seen on reviewed feedback/settings |
| Bare text-link CTAs on connection | Not seen after EVA-009 |
| Double field focus ring | Not seen (single source in `ui-interaction-system.css`) |
| Wrong card radius on content cards | Migrated on feedback/notifications/digest/person surfaces |

## Automated validation (final hardening tree)

| Command | Result |
|---------|--------|
| `npm run verify:design-system` | 24 tests passed (includes TS import + diff-base tests) |
| `npm test` | 789 passed, 2 skipped (6F tree) |
| `npm run test:backend` | 4 passed |
| `npm run build` | OK |
| `CI=1 npm run test:visual` | **287 passed** (×2, 0 failed) |
| `CI=1 npx playwright test executive-acceptance.spec.ts` | **59 passed**, 0 serial-bail skips |
| `cargo test` / `cargo check` (src-tauri) | OK |

## Pass 6F group review (automated + spot check)

| Group | Status | Notes |
|-------|--------|-------|
| Dashboard | PASS | 6E layout; cache visuals isolated |
| Performance | PASS | Subnav, delivery risk, people sort |
| Person | PASS | Drawer alignment; fixture photo/initials |
| Analytics | PASS | Drawer headers; backflows zero |
| Goals | PASS | Harness unchanged |
| Notifications | PASS | — |
| Feedback | PASS | 6C width/subnav/history |
| Settings | PASS | Diagnostics grouping |
| Resource Library | PASS | Opens via `metrio-open-resources` |
| Onboarding | POLISH | Re-baseline after 6E |
| Projects / Calendar | PASS | — |
| Connection screen | PASS | — |
| Dark subset | PASS | Spot-checked with harness |

## Intentional snapshot updates (this pass)

- `feedback-dark.png`, `feedback-cycles-dark.png`, `dark-25-feedback-survey.png` — canonical IconButton + feedback card radius (approved DS hardening).

## Demo data

Before leadership demo, walk `docs/executive-demo-data-checklist.md`. **REAL TENANT PHOTO QA NOT VERIFIED** (no corporate Bamboo session in CI/agent environment).
