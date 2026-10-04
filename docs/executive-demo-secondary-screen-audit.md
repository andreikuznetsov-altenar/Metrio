# Executive demo — secondary screen audit (Pass 5G)

**Verification method:** Each surface was rendered with `VITE_VISUAL_FIXTURE=1` and the Playwright flows in `e2e/visual/metrio.spec.ts` (lead / employee fixtures, Oct 2026). Status reflects what appears in the UI, not test file presence alone.

**Legend:** READY = acceptable for executive demo after data hygiene (see `executive-demo-data-checklist.md`). FIX REQUIRED = production UI gap fixed in Pass 5G or still needs manual data cleanup.

| Surface | Visual | Hierarchy | Empty state | Primary CTA | Cards / rows | Machine values | Responsive | Dark | Status |
|--------|--------|-----------|-------------|-------------|--------------|----------------|------------|------|--------|
| Performance Overview | `performance-overview.png` | Greeting metrics → Team Actions → Attention → charts | Skeleton + partial banners | Open person / Open Jira | `home-card` / performance tables | KPI labels humanized (5D) | 1280–1728 covered | `team-overview-dark.png` | **READY** |
| People | `people.png` | Table with avatar, badges, workload | Empty team copy | View person | Semantic badges, not raw export | Status from attention semantics | Subnav breakpoints | Dark via performance | **READY** |
| Radar | `radar.png` | Legend + quadrant grid | Empty quadrant copy | View person | Color + label pairs | Severity explained in legend | 1440 tests | Dark performance | **READY** |
| Delivery Risk | `team-delivery-risk.png` | Filtered risk table | No rows message | Open Jira | Table + badges | Jira status names (workflow) | Covered | Dark performance | **READY** |
| Goals | `team-goals.png` / employee goals | List + drawer | Empty goals card | Open goal | Goal list rows | Review dates formatted | Covered | `employee-goals-dark.png` | **READY** |
| Project Cockpit | `project-cockpit.png` | Header → signals → deps → work table | Muted empty sections | Open Jira / person | Card sections in drawer | Jira status column (expected) | Drawer width | `project-cockpit-dark.png` | **READY** |
| Dependencies | `dependencies.png` | Blocked-by links → detail drawer | “No blocked” muted line | Open dependency / Jira | Structured keys, not JSON dump | Project keys only where needed | In drawer | Dark cockpit | **READY** |
| Calendar / Meetings | `meetings.png` | Date headline → rows | Hidden when calendar off | Prepare for 1:1 | Compact meeting rows | Locale dates (no ISO) | Home column | Dark home | **READY** |
| Employee views | `employee-*.png` | My Week / goals subviews | Empty week copy | Open Jira | Compact rows | Dates formatted | Covered | `employee-dark.png` | **READY** |
| Onboarding / Getting Started | `onboarding.png` | Checklist card → drawer | Resource fallback | Open checklist | Card + progress | Day N from hire date | Home | `onboarding-checklist-dark.png` | **READY** |
| Resource Library | `resource-library.png` | Search → grouped ResourceRow | Empty search | Open in Confluence | ResourceRow + source | No guessed URLs in fixture | Drawer | `home-resource-library-dark.png` | **READY** |
| Feedback connected (Survey) | `feedback-connected-survey.png` | Google strip → setup / editor | N/A when connected | Connect / Save survey | DS cards + Input | OAuth errors humanized | 1440/1728 disconnected tests | `feedback-dark.png` | **READY** |
| Feedback Delivery | `feedback-delivery.png` | Metric stats → table | Disconnected empty | Review recipients | Stat cards + table | Recipient status labels | Tab panel | Dark disconnected | **READY** |
| Feedback Results | `feedback-results.png` | Metric grid → question rows | Empty metrics copy | — | MetricCard + badges | Survey index words (Excellent…) | Tab panel | Dark disconnected | **READY** |
| Feedback History | `feedback-history.png` | History rows | `feedback-history-empty.png` | Open survey | History card language | Date ranges localized | Tab panel | Dark disconnected | **READY** |
| Feedback Cycles (populated) | `feedback-cycle-populated.png` | Intro card → cycle cards | `feedback-cycles-empty.png` | Open run / Pause | Badges + metrics | **Was** raw `active` / `monthly` → **fixed 5G** (`Active`, `Monthly`) | Cycles tab | `feedback-cycles-dark.png` | **READY** (after 5G) |
| Settings (all sections) | `settings-*.png` | Section cards, not full-width bars | — | Save / Change | `settings-card` | Diagnostics uses `formatConnectionHealthLabel` | 1280–1440 attention rules | Diagnostics dark | **READY** |
| Diagnostics advanced | `settings-diagnostics-advanced-*.png` | Health grid → desktop → advanced | Running checks hint | Export bundle | Health rows | Confluence **Available via Jira** | Embedded layout | Dark variants | **READY** |
| Notifications by source | `notifications-*-source.png` | Filters → grouped list | `notifications-empty-source.png` | Open target | Notification cards | Source filter labels | Drawer | `notification-sidebar-dark.png` | **READY** |

## Pass 5G code fixes

- **Feedback cycles:** `feedbackCycleLabels.ts` + `FeedbackCyclesView` — status and cadence use `humanizeMachineEnum` (no raw `active` / `monthly` in badges).
- **Feedback recipients:** `data-testid="feedback-recipients-drawer"` for visual regression.
- **Visual matrix:** Added executive snapshot names listed in Pass 5G spec (`performance-overview`, `people`, `feedback-cycle-populated`, etc.).

## Remaining demo risks (data, not UI)

Placeholder goal titles, test survey names, and stale notification history are **FIX REQUIRED** at the data layer — see `docs/executive-demo-data-checklist.md`. Metrio does not auto-delete user data.
