# Phase 9 — packaged UI bugfixes

**Baseline:** `50be8905bb7bdb2374548852d218edcaec6ac5b7`

| Item | Fix |
|------|-----|
| Settings nav | `activeRoute={null}` while settings open |
| Trend arrows | `trendMovementDirection` from numeric delta; color from favorable semantic |
| KPI context | `contextCaption` vs previous period/range |
| Drawer history | Card layout, no horizontal clip |
| Attention grouping | `groupAttentionSignals` in drawer Overview |
| Cancelled tasks | `isTerminalNonCompletionStatus` excludes from active work |
| Settings labels | Single label per field; custom checkboxes; human sync times |
| Reset data | `btn--danger` |
| Feedback connect | Compact panel max-width 520px |
| Profile | `jobTitle` from Bamboo via `profileSubtitle` |
| PDF status | Auto-dismiss success/cancel after 3.5s; toolbar status overlay |
