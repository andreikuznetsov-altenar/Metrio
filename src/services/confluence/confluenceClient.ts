import { invoke } from "@tauri-apps/api/core";
import { parseInvokeError } from "../../platform/apiTypes";

export interface ConfluencePageSummary {
  id: string;
  title: string;
  spaceKey?: string;
  spaceName?: string;
  url: string;
  updatedAt?: string;
  excerpt?: string;
}

export interface ConfluenceClientConfig {
  baseUrl: string;
  email: string;
}

export async function testConfluenceConnection(
  config: ConfluenceClientConfig,
): Promise<{ displayName?: string }> {
  try {
    const me = await invoke<{ displayName?: string }>("confluence_test_connection", {
      config,
    });
    return { displayName: me.displayName };
  } catch (error) {
    throw parseInvokeError(error);
  }
}

export async function searchConfluencePages(
  config: ConfluenceClientConfig,
  cql: string,
  limit = 5,
): Promise<ConfluencePageSummary[]> {
  try {
    return await invoke<ConfluencePageSummary[]>("confluence_search_pages", {
      config,
      cql,
      limit,
    });
  } catch (error) {
    throw parseInvokeError(error);
  }
}
