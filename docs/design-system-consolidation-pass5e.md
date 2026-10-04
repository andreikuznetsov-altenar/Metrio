# Design system consolidation — Pass 5E audit

Baseline: `f6114f9` (Pass 5D). This document records pre-fix inconsistencies.

## Controls

| Component | Before | Target |
|-----------|--------|--------|
| `.btn` | 32px height | 36px default; `size="compact"` → 32px |
| `.input` | 32px | 36px |
| `.select-trigger` | 34px | 36px |
| `.icon-btn` | 32×32 | 36×36; compact 32×32 for tables |
| SegmentedControl options | ~28px inner | 34–36px total control |

Mixed 32px/36px in same toolbar rows (Settings credentials, Performance filters).

## Radius

- Content cards should use `--radius-card` (12px).
- `--radius-control` (8px) was used on Feedback inner panels, digest drawer chips, disconnected states, and some “card-like” blocks.

## Card padding / typography

- Generic `.card__title` at **13px** while `.home-card__title` at 14–16px.
- Analytics drawer title **21px** vs page greeting **20px**.
- Arbitrary paddings: analytics drawer body **24px**, analytics header right **56px** (legacy close offset).

## Surfaces

- Canvas `--color-background` vs card `--color-surface` — generally OK in light theme.
- Nested panels sometimes used `surface-secondary` on similar-toned canvas without border.

## Drawer header

- Core `Drawer` already uses flex `header` + `headerActions` + close.
- **Analytics** drawer CSS still reserved 56px right padding for obsolete absolute close layout.
- Per-drawer header padding overrides (`analytics`, `goal`, `digest`).

## Badges

- Team Actions / My Focus dashboard rows used **neutral** for all `reasonTag` values.
- Ad hoc badge variants in diagnostics vs central mapping.

## Bare CTAs

- `home-link-list` removed from most Dashboard lists in 5D; **Capacity** org block still plain list meta.
- `DashboardCompactRow` introduced; Action queue uses separate grid layout (same intent).

## Button groups

- Most groups use `gap: var(--space-2)` (8px) via `.settings-button-group` / `.home-card__actions`.
- Some local gaps at 4px or 12px.

## Empty states

- Feedback has `FeedbackEmptyState`; Home has `.home-empty-state`; Analytics uses custom aggregate panel.
- No shared `EmptyState` component before 5E.

## Focus

- `--focus-ring` and `--focus-outline` in tokens; global `*:focus-visible` box-shadow plus per-control outlines.

## Pass 5E fixes (summary)

See commit `5E` on `main`: tokens for control heights, 36px default controls, shared semantic badges, `EmptyState`, drawer header padding unification, compact action row alias, visual matrix.
