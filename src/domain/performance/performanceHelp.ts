export const performanceHelp = {
  throughput:
    "Successful completion cycles in the selected reporting period. Raw count is not a health or performance score.",
  firstPass:
    "Share of completed work accepted without returning to an earlier workflow stage.",
  reworkRate:
    "Reworked cycles ÷ completed cycles (the complement of First Pass). A cycle is reworked when it had at least one qualifying backflow; it is dated by its completion, so this can show a reworked cycle even when no Backflow Event happened in the same period.",
  completed: "Work completed within the selected reporting period.",
  backflows:
    "Qualifying review or QA returns dated by the actual event timestamp and attributed to the owner at that time. Multiple returns in one cycle are counted separately. Reworked cycles are dated by completion instead, so a period can show 1 reworked cycle and 0 Backflow Events.",
  teamAttention:
    "People with workload, task-health or availability signals that may need attention.",
  teamTrends:
    "Change in team performance compared with the previous comparable period.",
  teamWorkload:
    "Expected near-term assignee effort divided by available working hours. Delivery risk and Historical load are shown separately.",
  timeOff: "Planned team time off over the next 12 months from BambooHR.",
  people:
    "Team performance, workload, availability and attention signals for the selected period.",
  radar:
    "People with active task-health or workload signals that may require attention.",
  deliveryRisk:
    "Current Jira work with delivery-risk signals such as inactivity, rework or blocking states.",
  atRiskTasks:
    "Active tasks flagged at risk by cycle-time rules (not the same as Radar signals).",
} as const;

export type PerformanceHelpKey = keyof typeof performanceHelp;
