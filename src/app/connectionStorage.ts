import { resolveBambooSubdomain, resolveJiraBaseUrl } from "../config/product";
import {
  SECRET_KEYS,
  secureStoreDelete,
  secureStoreHas,
  secureStoreSet,
} from "../platform/secureStorage";
import type { ConnectFormInput } from "./connectAndContinue";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface ConnectionConfig {
  workEmail: string;
}

export interface ConnectionSecrets {
  jiraToken: string;
  bambooApiKey: string;
}

export interface SavedConnection {
  workEmail: string;
  jiraBaseUrl: string;
  bambooSubdomain: string;
  hasJiraToken: boolean;
  hasBambooApiKey: boolean;
}

const CONNECTED_KEY = "metrio-connection-connected";
const CONFIG_KEY = "metrio-connection-config";

export function isAppConnected(): boolean {
  return localStorage.getItem(CONNECTED_KEY) === "true";
}

export function markSessionConnected(): void {
  localStorage.setItem(CONNECTED_KEY, "true");
}

export function clearSessionMarker(): void {
  localStorage.removeItem(CONNECTED_KEY);
}

export async function readSavedConnection(): Promise<SavedConnection | null> {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) {
    return null;
  }

  try {
    const config = JSON.parse(raw) as ConnectionConfig;
    const [hasJiraToken, hasBambooApiKey] = await Promise.all([
      secureStoreHas(SECRET_KEYS.JIRA_API_TOKEN),
      secureStoreHas(SECRET_KEYS.BAMBOO_API_TOKEN),
    ]);
    return {
      workEmail: config.workEmail?.trim() ?? "",
      jiraBaseUrl: resolveJiraBaseUrl(),
      bambooSubdomain: resolveBambooSubdomain(),
      hasJiraToken,
      hasBambooApiKey,
    };
  } catch {
    return null;
  }
}

export async function persistConnectionConfig(
  config: ConnectionConfig,
  secrets: ConnectionSecrets,
): Promise<void> {
  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify({
      workEmail: config.workEmail.trim(),
    }),
  );

  if (secrets.jiraToken.trim()) {
    await secureStoreSet(SECRET_KEYS.JIRA_API_TOKEN, secrets.jiraToken.trim());
  }
  if (secrets.bambooApiKey.trim()) {
    await secureStoreSet(SECRET_KEYS.BAMBOO_API_TOKEN, secrets.bambooApiKey.trim());
  }
}

/** @deprecated Prefer persistConnectionConfig + markSessionConnected at the UI gate. */
export async function saveConnection(
  config: ConnectionConfig,
  secrets: ConnectionSecrets,
): Promise<void> {
  await persistConnectionConfig(config, secrets);
  markSessionConnected();
}

export async function clearConnection(): Promise<void> {
  clearSessionMarker();
  localStorage.removeItem(CONFIG_KEY);
  await Promise.all([
    secureStoreDelete(SECRET_KEYS.JIRA_API_TOKEN).catch(() => undefined),
    secureStoreDelete(SECRET_KEYS.BAMBOO_API_TOKEN).catch(() => undefined),
  ]);
}

export async function performConnection(input: ConnectFormInput): Promise<void> {
  const { connectAndContinue } = await import("./connectAndContinue");
  await connectAndContinue(input);
}
