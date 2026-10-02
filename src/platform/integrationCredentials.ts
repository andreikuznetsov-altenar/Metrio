import { SECRET_KEYS, secureStoreSet } from "./secureStorage";

export async function updateJiraToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Jira token is required.");
  }
  await secureStoreSet(SECRET_KEYS.JIRA_API_TOKEN, trimmed);
}

export async function updateBambooApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("Bamboo API key is required.");
  }
  await secureStoreSet(SECRET_KEYS.BAMBOO_API_TOKEN, trimmed);
}

export const MASKED_CREDENTIAL = "••••••••••••••••••••";
