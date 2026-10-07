# Pass 11 visual reconciliation (Pass 13.6)

Command: `npx playwright test e2e/visual/ui-repair-pass11.spec.ts`

Prior state: **15 passed / 16 screenshot failed / 1 skipped**.

## Classification of the 16 screenshot failures

| Test | Classification | Notes |
| --- | --- | --- |
| dashboard-recommendations-horizontal | Accepted Pass 13 | Tag → title hierarchy and card rhythm |
| dashboard-recommendation-cta-compact | Accepted Pass 13 | CTA pinned to card bottom |
| dashboard-lower-three-horizontal | Accepted Pass 13 | Lower grid spacing unchanged functionally |
| dashboard-goal-reviews-flat | Accepted Pass 13 | Flat goals summary card |
| dashboard-lower-cta-compact | Accepted Pass 13 | Compact CTA row |
| task-list-modal | Accepted Pass 13.5 | Column colgroup / widths |
| team-workload-columns-1280/1440/1728 | Accepted Pass 13 | Table geometry and column % |
| team-workload-header-1280 | Accepted Pass 13 | Header nowrap layout |
| people-columns-1440 | Accepted Pass 13 | People table columns |
| radar-columns-1440 | Accepted Pass 13 | Radar table columns |
| delivery-risk-columns-1280 | Accepted Pass 13 | Delivery risk columns |
| person-drawer-top-actions | Accepted Pass 13 | Drawer header toolbar alignment |
| person-brief-current-work | Accepted Pass 13 | Brief work list |
| person-scrollbar-shell | Accepted Pass 13 | Overlay scroll shell |
| performance-select-open | Accepted Pass 13 | Select popover |
| (none) | — | Functional-only tests excluded from screenshot set |

No regressions were identified that required product code changes beyond Pass 13/13.5 repairs.

Baselines updated in commit `UI13 Update accepted visual baselines` (Pass 13.6) after manual diff review.
