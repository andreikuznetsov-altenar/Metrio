# Design system enforcement correction audit

**Baseline reviewed:** `88fd827` (pre-correction). **Evidence from correction pass working tree.**

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | `design-system.css` not in production globals | **CONFIRMED** | `src/main.tsx` imports only `globals.css`; before fix `globals.css` had `tokens` + `ui-interaction-system` only. `design-system.css` was only referenced from unused `global.css`. |
| 2 | Competing `global.css` / `globals.css` | **CONFIRMED** | `src/styles/global.css` duplicated reset/focus; not imported anywhere in repo. Marked `@deprecated`; production uses `globals.css`. |
| 3 | Dual primitive systems (`components/ui`) | **CONFIRMED** | `FoundationDevApp` / `FoundationPage` import `src/components/ui/**`; production `AuthenticatedApp` uses `src/components/Button`, etc. Documented in `src/components/ui/README.md`. |
| 4 | No canonical Textarea | **CONFIRMED** | No `Textarea` component before pass. **Fixed:** `src/components/Textarea/`. |
| 5 | Input error focus double ring | **CONFIRMED** | `Input.css` `.input--error:focus-visible { box-shadow: var(--control-error-ring); }`. **Fixed:** border-only error focus. |
| 6 | Global `:focus-visible` ring on fields | **CONFIRMED** | `globals.css` applied `box-shadow: var(--focus-ring)` to all `:focus-visible`. **Fixed:** scoped to interactive elements; fields explicitly `box-shadow: none`. |
| 7 | Split scrollbar implementations | **CONFIRMED** | `ScrollArea.css`, `Drawer.css` duplicated webkit rules (6px vs 8px). **Fixed:** `.metrio-scroll` only in `ui-interaction-system.css`; drawer/scroll area use class. |
| 8 | Legacy tokens (`--radius-md`, etc.) | **CONFIRMED** | Used in `performance-dashboard.css`, `home.css`, etc. without definitions. **Fixed:** canonical tokens in `tokens.css`; usages migrated to `--radius-card` / `--color-border-subtle`. |
| 9 | Cards using `--radius-control` | **CONFIRMED** | e.g. `.settings-card` `settings.css:11`. **Fixed:** `--radius-card` on content cards. |
| 10 | Verifier line-only transitions | **CONFIRMED** | `designSystemVerify.ts` single-line regex missed multiline `transition`. **Fixed:** block parser. |
| 11 | `command-palette.css` literal 200ms | **CONFIRMED** | `command-palette.css:41-43`. **Fixed:** motion tokens. |
| 12 | Verifier scope pages/shell only | **CONFIRMED** | `FEATURE_PREFIXES` was `src/pages`, `src/shell`. **Fixed:** product components + primitive token authority checks. |
| 13 | Diff mode `git diff HEAD` | **CONFIRMED** | Only uncommitted changes. **Fixed:** `DESIGN_SYSTEM_BASE_SHA` + `git diff ${base}...HEAD`. |
| 14 | No CI workflow for verify | **CONFIRMED** | No workflow before pass. **Fixed:** `.github/workflows/design-system.yml`. |
| 15 | README missing contract section | **CONFIRMED** | Remote README had command only. **Fixed:** Design system section + rule quote. |
| 16 | Feedback hard-coded banner colors | **CONFIRMED** | `feedback-ds.css:9-17` `#fff7ed`, etc. **Fixed:** `--color-banner-*` tokens. |
| 17 | PHOTO transient 5xx session cache | **CONFIRMED** | `bambooAvatarService.ts` cached `failed` for full session. **Fixed:** 30s TTL for transient failures. |
| 18 | Broken image keeps bad data URL | **CONFIRMED** | `PersonAvatar` `onError` only cleared state. **Fixed:** `invalidateEmployeeAvatarCache(..., 'broken-image')`. |
| 19 | Real-tenant Bamboo photo QA | **NOT REPRODUCED** | No corporate Bamboo session in this environment. |
