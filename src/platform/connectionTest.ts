import { resolveBambooSubdomain, resolveJiraBaseUrl } from "../config/product";
import { readSavedConnection } from "../app/connectionStorage";
import { mapBambooConnectionError } from "../domain/setup/bambooConnectionErrors";
import { mapJiraConnectionError } from "../domain/setup/jiraConnectionErrors";
import { BambooClient } from "../services/bamboo/bambooClient";
import { JiraClient } from "../services/jira/jiraClient";

export type IntegrationTestLabel = "Connected" | "Failed" | "Needs attention";

export interface IntegrationTestResult {
  label: IntegrationTestLabel;
  detail: string;
}

export async function testJiraConnectionSaved(): Promise<IntegrationTestResult> {
  const saved = await readSavedConnection();
  if (!saved?.hasJiraToken) {
    return {
      label: "Needs attention",
      detail: "Add a Jira API token in Connections.",
    };
  }
  if (!saved.workEmail) {
    return {
      label: "Needs attention",
      detail: "Work email is missing. Reconnect integrations.",
    };
  }

  try {
    const client = new JiraClient({
      baseUrl: resolveJiraBaseUrl(),
      email: saved.workEmail,
    });
    const me = await client.testConnection();
    return {
      label: "Connected",
      detail: me.displayName ? `Signed in as ${me.displayName}.` : "Jira responded successfully.",
    };
  } catch (error) {
    const mapped = mapJiraConnectionError(error);
    return {
      label: "Failed",
      detail: mapped.message,
    };
  }
}

export async function testBambooConnectionSaved(): Promise<IntegrationTestResult> {
  const saved = await readSavedConnection();
  if (!saved?.hasBambooApiKey) {
    return {
      label: "Needs attention",
      detail: "Add a BambooHR API key in Connections.",
    };
  }
  if (!saved.workEmail) {
    return {
      label: "Needs attention",
      detail: "Work email is missing. Reconnect integrations.",
    };
  }

  try {
    const client = new BambooClient({
      subdomain: resolveBambooSubdomain(),
    });
    await client.testConnection();
    return {
      label: "Connected",
      detail: "BambooHR responded successfully.",
    };
  } catch (error) {
    const mapped = mapBambooConnectionError(error);
    return {
      label: "Failed",
      detail: mapped.message,
    };
  }
}
