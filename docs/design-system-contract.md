# Metrio design system contract (normative)

**Authority:** `src/styles/tokens.css` (tokens) · `src/styles/design-system.css` · `src/styles/ui-interaction-system.css` (global primitives) · `src/components/*` (control implementations).

**Agent / PR rule (verbatim):**

> New product components must not locally redefine shared primitive visual behavior. If a primitive or token exists in the Metrio design system, it must be reused.

## Component authoring checklist

Before adding feature CSS, confirm Metrio already provides:

- [ ] Button / IconButton  
- [ ] Input / Textarea / Select / Switch  
- [ ] Card / EmptyState / `surface-card`  
- [ ] Badge / Tooltip  
- [ ] Drawer (+ shared backdrop, motion, body scroll)  
- [ ] Table utilities (`performance-table`, UI interaction table rules)  
- [ ] Popover surfaces (Select, DatePicker, Profile menu patterns)  
- [ ] `.metrio-scroll` / `ScrollArea`  
- [ ] Motion tokens (`--motion-*`, `--ease-*`)

If yes → **reuse**. If no → extend tokens/primitives first (exception process below).

---

## Controls

| Token | Value | Usage |
|--------|--------|--------|
| `--control-height-default` | 36px (alias of `--control-height`) | Primary buttons, inputs, selects |
| `--control-height-compact` | 32px | Dense toolbars, compact rows |

**GOOD:** `height: var(--control-height-default);`  
**BAD:** `height: 35px;` / `height: 37px;` on standard controls.

---

## Radius

| Token | Usage |
|--------|--------|
| `--radius-micro` | Progress tracks, micro indicators |
| `--radius-badge` | Badge chip |
| `--radius-small` | Small chips, tight surfaces |
| `--radius-control` | Buttons, inputs, triggers |
| `--radius-card` | Cards, panels |
| `--radius-popover` | Dropdowns, popovers (defaults to control) |
| `--radius-pill` / `--radius-round` | Pills, fully rounded |

**GOOD:** `border-radius: var(--radius-card);`  
**BAD:** `border-radius: 9px;` in feature CSS.

Circular avatars / status dots may use `50%` only when documented (not arbitrary control radii).

---

## Borders

Use semantic tokens: `--border-subtle`, `--border-default`, `--border-accent`, `--border-danger` (map to theme colors).

**GOOD:** `border: 1px solid var(--border-default);`  
**BAD:** ad-hoc `#e2e5eb` in feature styles.

---

## Focus

- **Fields** (Input, Select, Textarea, date triggers): single accent border via `ui-interaction-system.css` — no extra `box-shadow` ring on focus.
- **Icon buttons / borderless controls:** `--focus-ring` / `--focus-outline` from tokens.
- Feature CSS must not add local `outline:` / `box-shadow:` focus rings on form controls.

---

## Motion

| Token | Typical use |
|--------|-------------|
| `--motion-fast` | 150ms — color, opacity |
| `--motion-standard` | 200ms — default UI |
| `--motion-slow` | 260ms — larger surfaces |
| `--ease-standard` / `--ease-enter` / `--ease-exit` | Easing |

**GOOD:** `transition: opacity var(--motion-fast) var(--ease-standard);`  
**BAD:** `transition: all 180ms ease;` in feature CSS.

---

## Scrollbars

Defined only in:

- `src/styles/ui-interaction-system.css` (`.metrio-scroll`)
- `src/components/ScrollArea/ScrollArea.css`
- `src/components/Drawer/Drawer.css` (drawer body)
- `src/components/ui/ui.css` (legacy scroll area)

Feature CSS (`src/pages/**`, `src/shell/**`) must **not** define `::-webkit-scrollbar`, `scrollbar-color`, or `scrollbar-width`.

---

## Primitives (TSX)

Use shared components — do not restyle native `<button>` / `<input>` to mimic them.

| Primitive | Path |
|-----------|------|
| Button | `src/components/Button` |
| IconButton | `src/components/IconButton` |
| Input | `src/components/Input` |
| Select | `src/components/Select` |
| Switch | `src/components/Switch` |
| Card | `src/components/Card` |
| Drawer | `src/components/Drawer` |
| Badge | `src/components/Badge` |
| Tooltip | `src/components/Tooltip` |
| Tabs / SegmentedControl | `src/components/Tabs`, `SegmentedControl` |

---

## Cards & surfaces

Prefer `Card`, `EmptyState`, or `.surface-card` from `design-system.css` — not one-off background + border + radius per screen.

---

## Drawers

Use `Drawer` — feature CSS may set width, header content, and body layout only. No local backdrop, close placement, base animation, or scrollbar styling.

---

## Tables

`performance-table` + rules in `ui-interaction-system.css`. Feature CSS may set **column widths** and grid composition only — not row dividers, hover, or header chrome.

---

## Allowed local CSS (feature layers)

- Grid / flex layout, max-width, responsive breakpoints  
- Column proportions for tables  
- Content spacing using `--space-*`  
- Charts, avatars (`50%`), data-viz geometry  
- Illustration dimensions  

---

## Exception process

1. Decide if the behavior is reusable.  
2. Add or extend a token/primitive in `src/styles` or `src/components`.  
3. Document in this file or `docs/ui-interaction-rules.md`.  
4. Consume from the feature — **no one-off literals**.

Temporary legacy suppressions: `src/build/design-system-allowlist.json` (file + rule + reason). **New suppressions require justification.**

---

## Verification

```bash
npm run verify:design-system
```

Optional diff mode (CI on changed files):

```bash
DESIGN_SYSTEM_DIFF=1 npm run verify:design-system
```

See `src/build/designSystemVerify.ts` for enforced rules on `src/pages/**` and `src/shell/**`.
