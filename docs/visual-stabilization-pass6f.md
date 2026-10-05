# Visual stabilization Pass 6F

**Baseline (spec):** `c7e2af6f9a534eef17f7e7fb7d15efb6b4d5acb1`  
**Branch start on main:** `be8a33c` (auth logo) → **6F landing SHA:** `3528403afeaee2f993013e34fff05b966354b07e`  
**Scope:** Stabilize Playwright after 6C–6E and 6A.1 (no product features).

## Initial failure snapshot (run 1, pre-fix, from `c7e2af6`)

`CI=1 npm run test:visual` — **~83 failed**; executive **serial-bail** after `34-resource-library`.

| Test / group | Class | Root cause | Fix | Snapshot |
|--------------|-------|------------|-----|----------|
| `34-resource-library`, `resource-library`, `home-resource-library*` | A | Dashboard 2.0 removed CTA | `openResourceLibrary()` → `metrio-open-resources` | No |
| Executive suite after #34 | F | `serial` skipped remaining tests | Removed `serial` from executive + ui-system | — |
| Dashboard / Feedback / Settings bulk | B/E | 6E dashboard, 6C feedback, 6A sort headers | Approved PNG updates | Yes |
| `dashboard-employee`, `dashboard-director` | A | `bootMetrio` left user on Performance | `bootConnected` + home assertions | Yes |
| `home relevant knowledge` | A | Removed `home-relevant-knowledge` testid | `.executive-lower-section` region | Yes |
| New assignments / compact row / capacity | A | Old regions / empty assignment card | Team actions row + **Team capacity** | Yes |
| `feedback-history` Survey sort | A | Global `/Survey/` match | Sort within `feedback-history-table` | Yes |
| `command palette search issue` | D | Remote merge on `UX-` prefix | Query `UX-2962` (cached issue) | Yes |
| `search open` / `search dark` | D | Palette not ready | Wait for Quick find textbox | Yes |
| `humanized-status-values`, `focus-states` | B | Auth `Logo.svg` branding | Updated connection baselines | Yes |
| Dashboard cache tests (intermittent) | D/F | Ephemeral cache keys leaked | `VISUAL_EPHEMERAL_STORAGE_KEYS` in boot | — |

## Infrastructure

- `e2e/visual/visualBoot.ts`: `bootConnected`, `openResourceLibrary`, `VISUAL_EPHEMERAL_STORAGE_KEYS`.
- `executive-acceptance.spec.ts`: independent tests; resource library via event.
- `metrio.spec.ts`: navigation + isolation fixes above.

## Final automated results

| Command | Result |
|---------|--------|
| `CI=1 npm run test:visual` | **290 passed**, **0 failed** (confirmed green run post-fix) |
| `CI=1 npx playwright test executive-acceptance.spec.ts` | **59 passed**, 0 serial-bail skips |
| `npm test` | **790 passed**, 2 skipped |
| `npm run verify:design-system` | 24 passed |
| `npm run test:backend` | 4 passed |
| `npm run build` | OK |
| `cargo test` / `cargo check` | OK |

## Bamboo photo

**REAL TENANT PHOTO QA NOT VERIFIED** (fixture visuals only).
