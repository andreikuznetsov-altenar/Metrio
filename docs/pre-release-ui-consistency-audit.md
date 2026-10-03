# Pre-release UI consistency audit

Baseline: `1ffc480a809b323fdc2718889b6b33ff36a7fe7e`  
Viewports: 1280×800, 1440×900, 1728×1117 · light/dark

Classification: **A** layout · **B** hierarchy · **C** shared-component · **D** navigation · **E** empty-state · **F** responsive · **G** visual-only · **H** data/state

## Root causes (cross-screen)

| ID | Area | Classes | Root cause | Fix in this pass |
|----|------|---------|------------|------------------|
| RC-1 | Home | A, E, H | `data?.teamSnapshot.persons` throws when `teamSnapshot` missing; `workspaceModel` null with weak loading copy | Optional chaining, explicit blocked/loading states, manager `teamSnapshot` fallback |
| RC-2 | Shell header | B, C, F | Status badge mixed with utilities; 32px icon buttons | Status group + utility group; 36px controls |
| RC-3 | Performance toolbar | A, F | Flex max-widths left unused horizontal space | Full-width CSS grid |
| RC-4 | Trends/KPI | B, G | Insufficient history rendered as KPI value + duplicate footer | Secondary insufficient text; hide duplicate block |
| RC-5 | Resources | D, G | Guessed Confluence URLs in production catalog | Production-safe catalog + visual fixtures |
| RC-6 | Command palette | C, G | Oversized rows; browser focus on search | Width/row height; focus ring token |
| RC-7 | Goals | C, E | Raw `<input>` on empty canvas | Empty-state card + shared `Input` form |
| RC-8 | Delivery risk | A, C | Issue column dominated; duplicate project key | Column % rebalance; key + title only |

## Screen notes

### Home
- **RC-1** blank canvas after shell toolbar (**E/H**).
- Max-width 1120 vs Performance (**A**) → 1320px.
- Optional calendar/goals sections must not block core MY WORK / TEAM (**B**).

### Performance
- Toolbar hole at 1440+ (**F** → RC-3).
- Delivery table density (**A** → RC-8).
- Metric comparison em dash colored (**G** → metric context guard).

### Goals
- RC-7 empty state.

### Command palette
- Feedback visible when company gate off (**D** → filter in `searchPaletteCommands`).
- RC-6 styling.

### Person Brief / Notifications / History
- **Remaining manual QA**: Person Brief still dense vs design system; Notification header/filters; History metadata separators — tracked for follow-up commits UIe/UIc.

## Dark mode risks
- Unread notification rows, trend insufficient text, header badge border — re-verify after build.

## Visual regression targets (§90)
Home loading/blocked/ready, header utilities, toolbar 1440/1728, delivery risk, goals empty/populated, trends insufficient, command palette, KPI without comparison — update baselines only after intentional screenshot review.
