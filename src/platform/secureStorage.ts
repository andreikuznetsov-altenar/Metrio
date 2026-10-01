import { invoke } from '@tauri-apps/api/core';

const SERVICE = 'com.altenar.metrio';

export const SECRET_KEYS = {
  JIRA_API_TOKEN: 'jira_api_token',
  BAMBOO_API_TOKEN: 'bamboo_api_token',
} as const;

/** Store secret in native keychain. Token is never read back into the webview. */
export async function secureStoreSet(key: string, secret: string): Promise<void> {
  await invoke('secure_store_set', { service: SERVICE, account: key, secret });
}

export async function secureStoreDelete(key: string): Promise<void> {
  await invoke('secure_store_delete', { service: SERVICE, account: key });
}

export async function secureStoreHas(key: string): Promise<boolean> {
  return invoke<boolean>('secure_store_has', { service: SERVICE, account: key });
}

export interface SecureStoreVerify {
  exists: boolean;
  readable: boolean;
  length?: number;
}

/** Verify native secure storage without returning secret contents. */
export async function secureStoreVerify(key: string): Promise<SecureStoreVerify> {
  return invoke<SecureStoreVerify>('secure_store_verify', { service: SERVICE, account: key });
}

export interface CredentialImportLegacyResult {
  jira_imported: boolean;
  bamboo_imported: boolean;
  google_imported: boolean;
}

/** Explicit user action only — may trigger macOS Keychain authorization once. */
export async function credentialImportLegacy(): Promise<CredentialImportLegacyResult> {
  return invoke<CredentialImportLegacyResult>('credential_import_legacy');
}
