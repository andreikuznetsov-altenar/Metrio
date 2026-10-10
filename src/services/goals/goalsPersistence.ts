import { invoke } from "@tauri-apps/api/core";
import {
  GOALS_DATA_SCHEMA_VERSION,
  type GoalsDataFile,
} from "../../domain/goals/goalTypes";
import { normalizeGoalsFile } from "../../domain/goals/normalizeGoal";
import { fetchCloudGoals } from "../metrioCloud/metrioCloudClient";
import { MetrioCloudError } from "../metrioCloud/metrioCloudErrors";
import { getDocFixtureMode } from "../../platform/docFixtures";

export const EMPTY_GOALS_DATA: GoalsDataFile = {
  schemaVersion: GOALS_DATA_SCHEMA_VERSION,
  goals: [],
  history: [],
};

const VISUAL_GOALS_KEY = "metrio-visual-goals";

function isVisualFixtureBuild(): boolean {
  return import.meta.env.VITE_VISUAL_FIXTURE === "1";
}

export async function loadGoalsDataLocal(): Promise<GoalsDataFile> {
  const docMode = await getDocFixtureMode();
  if (docMode.enabled) {
    const { buildDocGoalsData } = await import("../../fixtures/docFixtureData");
    return buildDocGoalsData();
  }

  if (isVisualFixtureBuild() && typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(VISUAL_GOALS_KEY);
    if (raw) {
      return normalizeGoalsFile(JSON.parse(raw) as Partial<GoalsDataFile>);
    }
  }
  try {
    const raw = await invoke<Partial<GoalsDataFile>>("goals_data_load");
    return normalizeGoalsFile(raw);
  } catch {
    return EMPTY_GOALS_DATA;
  }
}

export async function loadGoalsData(): Promise<GoalsDataFile> {
  const docMode = await getDocFixtureMode();
  if (docMode.enabled) {
    const { buildDocGoalsData } = await import("../../fixtures/docFixtureData");
    return buildDocGoalsData();
  }

  try {
    const cloud = await fetchCloudGoals();
    if (cloud) {
      const normalized = normalizeGoalsFile(cloud);
      if (!isVisualFixtureBuild()) {
        await invoke("goals_data_save", { data: normalized }).catch(() => undefined);
      }
      return normalized;
    }
  } catch (e) {
    if (e instanceof MetrioCloudError && e.code !== "offline") {
      throw e;
    }
  }
  return loadGoalsDataLocal();
}

export async function saveGoalsData(data: GoalsDataFile): Promise<void> {
  const payload = normalizeGoalsFile(data);
  const docMode = await getDocFixtureMode();
  if (docMode.enabled) {
    return;
  }
  if (isVisualFixtureBuild() && typeof localStorage !== "undefined") {
    localStorage.setItem(VISUAL_GOALS_KEY, JSON.stringify(payload));
    return;
  }
  await invoke("goals_data_save", { data: payload });
}
