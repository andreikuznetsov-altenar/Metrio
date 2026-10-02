export const performanceHelp = {
  efficiency:
    "Overall performance score based on completion, first pass, cycle time and backflows.",
  firstPass:
    "Share of completed work accepted without returning to an earlier workflow stage.",
  completed: "Work completed within the selected reporting period.",
  backflows:
    "Completed work that returned to an earlier workflow stage.",
  teamAttention:
    "People with workload, task-health or availability signals that may need attention.",
  teamTrends:
    "Change in team performance compared with the previous comparable period.",
  teamWorkload:
    "Current Jira workload based on issues presently assigned to each person.",
  timeOff: "Upcoming BambooHR availability.",
  people:
    "Direct reports with workload, availability, and attention signals for the selected period.",
  radar: "Operational signals that may need manager review across the team.",
  deliveryRisk:
    "Issues at elevated delivery risk based on age, status, and assignment patterns.",
  atRiskTasks:
    "Active tasks flagged at risk by cycle-time rules (not the same as Radar signals).",
} as const;

export type PerformanceHelpKey = keyof typeof performanceHelp;
