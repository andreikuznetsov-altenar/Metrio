import { loadGoalsDataLocal, saveGoalsData } from "../goals/goalsPersistence";
import { isMetrioCloudConfigured, saveCloudGoal } from "./metrioCloudClient";

/**
 * Uploads local goals to cloud when connected and cloud has no goals yet.
 * Skips visual fixture builds. Does not run automatically — call after explicit user connect.
 */
export async function migrateLocalGoalsToCloudIfEmpty(): Promise<void> {
  if (!isMetrioCloudConfigured()) return;
  const local = await loadGoalsDataLocal();
  if (!local.goals.length) return;
  for (const goal of local.goals) {
    await saveCloudGoal({ ...goal, revision: goal.revision ?? 1 }, "POST");
  }
  await saveGoalsData(await loadGoalsDataLocal());
}
