# Phase 10 — UI consistency & packaged QA

## Motion tokens (`src/styles/tokens.css`)

| Token | Duration | Use |
|-------|----------|-----|
| `--motion-hover` | 120ms | Hover on controls, links, table rows, nav |
| `--motion-control` | 140ms | Focus rings, disabled/loading opacity |
| `--motion-popover` | 160ms | Tooltips (popover-style surfaces) |
| `--motion-drawer` | 200ms | Drawer panel + backdrop |

Rules enforced: **no** `transition: all`, **no** scale-on-press, **no** bounce easing.

## Shared component states

Verified in Playground and production screens:

| Component | default | hover | active | focus-visible | disabled | loading | error |
|-----------|---------|-------|--------|---------------|----------|---------|-------|
| Button | yes | yes | background press | yes | yes | yes | — |
| Input | yes | yes | — | yes | yes | — | yes |
| Select | yes | yes | — | yes | yes | — | yes |
| Tabs | yes | yes | background press | yes | yes | — | — |
| IconButton | yes | yes | background press | yes | yes | — | — |
| Tooltip | yes | opacity | — | yes | — | — | — |
| Drawer | slide | — | — | yes (controls inside) | — | — | — |
| Badge | static | — | — | — | — | — | — |
| Card | static | — | — | — | — | — | — |
| Table row | yes | yes | yes | yes (interactive cells) | — | — | — |
| Links (`a`) | yes | yes | color press | yes | — | — | — |
| Profile popover | menu items match nav/control patterns | | | | | | |

Popover = profile menu surface (instant mount, no scale).

## Layout QA

- Window: **1180×760**, `resizable: false` (`src-tauri/tauri.conf.json`)
- `html/body/#root`: `overflow: hidden`
- Only `.scroll-area` scrolls vertically; `overflow-x: hidden`
- Themes: light / dark via `[data-theme]` + Profile theme toggle

## Keyboard

- Tabs: arrow keys between tab triggers
- Drawer: focus management in `Drawer.tsx`
- Global `:focus-visible` ring via `--focus-ring`

## Manual packaged QA (macOS)

```bash
npm run build
npm run tauri build
```

Open `src-tauri/target/release/bundle/macos/Metrio.app`.

## Windows build

```bash
rustup target add x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-pc-windows-msvc
```

## Automated checks

```bash
npm test
npm run build
cd src-tauri && cargo check
```
