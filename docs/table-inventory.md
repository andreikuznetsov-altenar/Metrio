# Metrio tabular UI inventory (Pass 6C / 6A.1)

Semantic data tables and table-like lists consolidated on the shared `performance-table` system (`ui-interaction-system.css` + `performance-table-wrap`).

| Surface | Location | Columns (data) | Sorting (6C) |
|--------|----------|----------------|--------------|
| People | `TeamPeopleView.tsx` | Person, Efficiency, Attention, Availability, Workload | Yes |
| Delivery risk | `TeamDeliveryRiskView.tsx` | Issue, Risk, Owner, Age, Review, Status, Action | Yes |
| Radar | `TeamRadarView.tsx` | Person, Reason, Issues, Action, Severity | Yes |
| Team attention (overview) | `TeamOverviewView.tsx` | Person, Attention, Issues, Severity, Workload | Yes (semantic severity/workload) |
| Team workload (overview) | `TeamOverviewView.tsx` | Person, Active, At-risk, Workload, Availability | Yes (semantic workload/availability) |
| Attention signals | `AttentionSignalsTable.tsx` | Signal, Tasks, Reason, Issues | Yes |
| Director teams | `DirectorTeamsView.tsx` | Team, People, Active work, Attention, … | Yes |
| Director overview | `DirectorOverviewView.tsx` | Team, Attention, Active work | Yes |
| Feedback delivery | `FeedbackDeliveryView.tsx` | Recipient, Tasks, Email, Status | Yes |
| Feedback recipients drawer | `FeedbackRecipientsDrawer.tsx` | Select, Name, Email, Tasks, Status | Yes (boolean selected + semantic status) |
| Feedback history | `FeedbackHistoryView.tsx` | Survey, Period, Sent, Responses, Rate, Status, State | Yes |
| Project active work | `ProjectCockpitDrawer.tsx` | Key, Title, Status, Owner, Age | Yes |
| Project dependencies | `ProjectCockpitDrawer.tsx` | Source, Blocked by, Route | Yes |
| Executive focus / team queues | `DashboardQueuePanel.tsx` | Work, Reason, Status, Action | Yes |
| Executive project signals | `ManagerExecutiveDashboard.tsx` | Project, Signal, Action | Yes |

**Not tabular (cards / metrics / grouped lists):** Feedback Results (metric cards), Feedback Cycles (cycle cards), Employee work history (grouped issue rows), Performance trends (cards).

**Email-only:** `emailTemplate.ts` presentation tables (out of app UI scope).
