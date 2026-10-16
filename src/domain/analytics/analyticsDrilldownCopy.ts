import { performanceHelp } from "../performance/performanceHelp";
import type { AnalyticsDrilldownMetric } from "./analyticsEvidenceTypes";

export const analyticsDrilldownDescription: Record<AnalyticsDrilldownMetric, string> = {
  completed: performanceHelp.completed,
  first_pass: performanceHelp.firstPass,
  backflows: performanceHelp.backflows,
  avg_cycle:
    "Median elapsed business time from contributor-cycle start to successful completion.",
};

export const analyticsDrilldownTitle: Record<AnalyticsDrilldownMetric, string> = {
  completed: "Completed",
  first_pass: "First pass",
  backflows: "Backflow events",
  avg_cycle: "Median cycle time",
};
