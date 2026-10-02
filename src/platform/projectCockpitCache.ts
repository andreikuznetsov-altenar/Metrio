import type { ProjectCockpitModel } from "../domain/projectCockpit/projectCockpitTypes";

const cache = new Map<string, ProjectCockpitModel>();

export function projectCockpitCacheKey(
  datasetKey: string,
  projectKey: string,
): string {
  return `${datasetKey}:${projectKey.toUpperCase()}`;
}

export function getCachedProjectCockpit(
  key: string,
): ProjectCockpitModel | undefined {
  return cache.get(key);
}

export function setCachedProjectCockpit(
  key: string,
  model: ProjectCockpitModel,
): void {
  cache.set(key, model);
}

export function clearProjectCockpitCacheForTests(): void {
  cache.clear();
}
