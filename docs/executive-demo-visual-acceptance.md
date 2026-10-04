# Executive demo visual acceptance

**Baseline (UI Repair Pass 5G):** `aff7d0e` (`origin/main`)  
**Acceptance harness:** `e2e/visual/executive-acceptance.spec.ts` + `e2e/visual/visualBoot.ts`  
**Primary viewport:** 1440×900  
**High-risk viewports:** 1280×800, 1728×1117 (dashboard, performance overview, delivery risk, notifications)  
**Screenshots:** `e2e/visual/__screenshots__/executive-acceptance.spec.ts/`  
**Review date:** 2026-10-04  
**Method:** Rendered PNG review + checklist A–R (not suite green-only)

## Readiness summary

| Criterion | Result |
|-----------|--------|
| BLOCKER issues open | 0 |
| HIGH issues open | 0 |
| Obvious broken layout | No (after fixes) |
| Contradictory KPI on reviewed analytics drawers | No |
| Raw machine UI on reviewed screens | No |
| Primary CTAs visually present | Yes |
| **READY FOR EXECUTIVE DEMO** | **YES** |
| **READY FOR NOTARIZATION** | **NO** (out of scope this pass) |

## Scores (/10)

| Dimension | Score | Deductions |
|-----------|-------|------------|
| Visual consistency | 8 | Fixture **Offline** chip; visual-only **Dev fixtures** in profile menu; dense fixture ages (189d) in cockpit |
| Information hierarchy | 8 | Performance **Team actions** rows were visually sparse before grid fix; home still card-dense but first viewport reads |
| Data trust | 9 | KPI/drawer copy aligned on sampled analytics; weekly digest humanized (`28 Sep – 4 Oct 2026`) |
| Navigation clarity | 9 | Global nav, settings sections, feedback tabs coherent |
| Empty states | 9 | Connection, feedback survey disconnected, goals empty intentional |
| **Executive demo readiness** | **8** | Production demo still needs manual data pass per `executive-demo-data-checklist.md` |

## Screens reviewed

| # | Screen | Light 1440 | Dark | Notes |
|---|--------|------------|------|-------|
| 01 | Dashboard manager | ✓ | ✓ | First viewport: team brief, digest, focus, team actions |
| 02 | Dashboard employee | ✓ | — | |
| 03 | Dashboard new starter | ✓ | — | |
| 04 | Performance overview | ✓ | ✓ | + 1280 / 1728 |
| 05 | People | ✓ | — | |
| 06 | Radar | ✓ | — | |
| 07 | Delivery risk | ✓ | ✓ | + 1280 / 1728 |
| 08 | Goals empty | ✓ | — | |
| 09 | Goals populated | ✓ | ✓ (dark-09) | |
| 10 | Goal drawer | ✓ | — | |
| 11 | Person overview | ✓ | ✓ (dark-11) | |
| 12 | Person work | ✓ | — | |
| 13 | Person history | ✓ | — | |
| 14 | Person brief | ✓ | ✓ | |
| 15–18 | Analytics drawers | ✓ | — | Completed, first pass, efficiency, backflows |
| 19 | Weekly digest | ✓ | — | |
| 20 | Notifications | ✓ | ✓ | + 1280 / 1728 |
| 21 | Search | ✓ | ✓ | |
| 22–23 | Feedback cycles | ✓ | — | Humanized badges (5G) |
| 24–25 | Feedback survey | ✓ | ✓ | Disconnected / connected |
| 26–28 | Feedback delivery/results/history | ✓ | — | |
| 29–32 | Settings | ✓ | ✓ (connections) | Diagnostics via Company & App |
| 33 | Diagnostics | ✓ | ✓ | |
| 34 | Resource library | ✓ | — | |
| 35 | Onboarding | ✓ | — | |
| 36 | Project cockpit | ✓ | — | Period label fixed |
| 37 | Dependencies | ✓ | — | |
| 38 | Calendar / meetings | ✓ | — | |
| 39 | Initial connection | ✓ | — | |
| 40 | Profile menu | ✓ | — | Dev fixtures = fixture mode only |

**Screenshot count:** 51 primary + 8 high-risk viewport = **59** (after harness update).

## Issue log

| ID | Screen | Screenshot | Severity | Problem | Expected | File / component | Status |
|----|--------|------------|----------|---------|----------|------------------|--------|
| EVA-001 | Dashboard, Performance overview | `01-dashboard-manager.png`, `04-performance-overview.png` | HIGH | Copy **「1 tasks in Review」** | **「1 task in Review」** | `src/domain/actions/dedupeActions.ts` | **Fixed** |
| EVA-002 | Project cockpit | `36-project-cockpit.png` | HIGH | **「Period analytics: vs previous 30 days」** without primary range | **「4 Sep – 4 Oct 2026 · vs previous 30 days」** (or equivalent) | `buildProjectCockpit.ts`, `ProjectCockpitDrawer.tsx` | **Fixed** |
| EVA-003 | Performance overview | `04-performance-overview.png` | HIGH | Team actions: broken row (orphan 20px grid column / word-by-word wrap) | Same compact row pattern as Home Team actions | `action-queue.css`, `TeamOverviewView.tsx` (`variant="dashboard"`) | **Fixed** |
| EVA-004 | Global header | multiple | POLISH | **Offline** status with visual fixtures | Online or hidden in production channel | sync / fixture prefs | Open (demo machine) |
| EVA-005 | Profile menu | `40-profile-menu.png` | POLISH | **Dev fixtures** block visible | Hidden when `BUILD_CHANNEL=production` | `ProfileMenu.tsx` | Open (fixture runs only) |
| EVA-006 | Demo data | Goals, notifications | MEDIUM | Placeholder goal titles, stacked notification history | Manual cleanup per checklist | `docs/executive-demo-data-checklist.md` | Open (process) |
| EVA-007 | Weekly digest card (home) | `01-dashboard-manager.png` | POLISH | Card subtitle truncates with ellipsis on narrow column | Full sentence or shorter copy | home digest card | Open |

## Zero-tolerance scan (reviewed set)

| Check | Result |
|-------|--------|
| Word-by-word wrapping | None flagged |
| Broken grid / overflow | None after EVA-003 |
| Raw `not_configured` | Not seen |
| Raw ISO `2026-09-28` in UI | Not seen (digest drawer uses formatted range) |
| Native number spinners | Not seen |
| Stacked drawer backdrops | Not seen |
| Contradictory KPI vs drawer (sampled) | Not seen |

## Special reviews

### Dashboard (§7)

- First viewport (`data-testid="dashboard-first-viewport"`): team brief, weekly digest, my focus, team actions visible.
- Not card soup: two-column operational layout; goal reviews only when attention needed (5F).

### Analytics (§8)

- Sampled KPI cards on overview match drawer headlines on completed / first pass / efficiency / backflows captures.

### Notifications (§9)

- Header actions on one row; source tabs one line; unread section first; CTAs framed.

### Feedback (§10)

- Disconnected: **Connect Google** empty state; connected capture uses survey fixture — no raw enums.

### Settings (§11)

- Grouped cards; attention rules grid; connections helpers; diagnostics under Company & App.

## Accessibility quick review (§20)

Spot-checked via component patterns and prior passes: icon buttons use `aria-label`; drawers trap focus; settings toggles are native-styled app controls. Full keyboard pass recommended on demo machine before room.

## Performance quick review (§21)

No new duplicate Performance fetch patterns introduced in this acceptance pass (copy/CSS-only fixes).

## Automated validation (§19)

| Command | Result (2026-10-04) |
|---------|---------------------|
| `npm test` | 697 passed, 1 skipped; 1 post-teardown timer warning in `performanceDataContext.loadingOverlay.test.ts` (exit 0) |
| `npm run test:backend` | 4 passed |
| `npm run build` | OK |
| `CI=1 npm run test:visual` | **240 passed** (`metrio.spec.ts`) |
| `CI=1 npx playwright test executive-acceptance.spec.ts` | **59 passed** |
| `cargo test` / `cargo check` (src-tauri) | OK |

**Working-tree acceptance commit:** not yet on `origin/main` (baseline remains `aff7d0e` until merge).

## Fix loop (§17–18)

Regenerate only affected snapshots after EVA-001–003:

```bash
CI=1 npx playwright test executive-acceptance.spec.ts --update-snapshots
```

## Demo data (§13)

Before leadership demo, walk `docs/executive-demo-data-checklist.md` — do not auto-modify production Jira/Bamboo/Goals.
