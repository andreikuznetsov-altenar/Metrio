# Metrio UI interaction rules (global)

These rules apply to **all** Metrio screens — current and future. The normative contract is **`docs/design-system-contract.md`**. Implement via shared tokens and components in `src/styles/ui-interaction-system.css`, `src/styles/tokens.css`, and design-system primitives.

> New product components must not locally redefine shared primitive visual behavior. If a primitive or token exists in the Metrio design system, it must be reused.

## Links vs buttons

| Use | For |
|-----|-----|
| **Entity link** (`EntityLink`, `.entity-link`) | Issue keys, document titles, project names, person names when navigating to a destination |
| **Button** | Actions: Open Jira, View person, Connect, Export, Test connection |

- Do not style plain text with accent color unless it is interactive.
- Non-navigable keys use `.entity-link--static` (no accent color).
- External URLs open via `openExternalUrl` (never ad-hoc `window.open`).

## Tables

- Prefer `<table class="performance-table">` (or shared grid) for operational data.
- **One row height** per logical row: `vertical-align: middle` on cells; no per-cell `max-height` that breaks alignment.
- Multiline text: clamp inside a child (`.performance-table__clamp`), not on `<td>` with `display: -webkit-box`.
- Dividers: `border-bottom` on `<tr>` / table rows, not isolated cells.
- Action column: right-aligned, vertically centered.
- Header and body share the same column definition (`table-layout: fixed` + matching `nth-child` widths where used).

## Focus (inputs)

- **Single blue border** on focus for Input, Select, Textarea, date controls.
- No simultaneous outer `box-shadow` focus ring on fields.
- Icon buttons and inline links keep `--focus-ring` where there is no field border.
- All fields use `box-sizing: border-box`; focus border width compensated with padding (`metrio-field`).

## Scrollbars

- Scrollable regions use `.metrio-scroll` (drawers, `ScrollArea`, long panels).
- Thin thumb, transparent track, hover strengthening; `scrollbar-width: thin` on Firefox.
- Prefer **one** vertical scroll per drawer (header fixed, body scrolls).

## Motion

Tokens: `--motion-fast` (150ms), `--motion-standard` (200ms), `--motion-slow` (260ms), `--ease-standard`, `--ease-enter`, `--ease-exit`.

- Dropdowns/popovers: `.metrio-popover-surface` (opacity + translateY).
- Expand/collapse: `.metrio-collapsible` (grid `0fr` → `1fr` + opacity).
- Drawers: existing slide tokens (`--motion-drawer`).
- `prefers-reduced-motion: reduce`: disable non-essential animation; collapsible content still available.

## Smooth scroll

- `scroll-behavior: smooth` on `.metrio-scroll` for programmatic/in-viewport navigation only.
- Native wheel/trackpad scrolling stays native (no JS easing).

## Verification

- Unit: `src/test/uiSystemPass.test.tsx`
- Visual: `e2e/visual/ui-system.spec.ts`
- Interaction: `e2e/visual/ui-system-interaction.spec.ts`
