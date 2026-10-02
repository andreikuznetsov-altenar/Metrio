# Organization signal thresholds (Phase 22)

Deterministic rules for `OrganizationSignal`. No trend signal is emitted without sufficient history (team KPI snapshot series ≥ 14 days with ≥ 8 non-zero points).

| Kind | Threshold |
|------|-----------|
| `review_bottleneck` | ≥ 5 active tasks in Review (status matches `/review/i`) in the same team |
| `delivery_risk_concentration` | ≥ 4 delivery-risk items for the same team |
| `workload_concentration` | ≥ 3 members Heavy/Overloaded when team size ≥ 4, or ≥ 2 when team size ≤ 3 |
| `leave_capacity` | ≥ 2 members with `vacation_soon` / `vacation_tomorrow` and ≥ 10 combined active tasks |
| `cycle_time_deterioration` | Team avg cycle trend ↑ ≥ 15% vs prior window with sufficient history |
| `rework_increase` | Team backflows ↑ ≥ 2 vs prior window with sufficient history |
| `feedback_pending` | ≥ 3 pending survey recipients (org-wide, authorized scope only) |
| `new_starter_capacity` | ≥ 2 new starters (`hireDate` &lt; 60 days) in the same team |

Signals aggregate one row per `(teamId, kind)` per period.
