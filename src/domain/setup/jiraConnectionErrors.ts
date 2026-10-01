import { ApiError } from '../../platform/apiTypes';
import { resolveJiraBaseUrl } from '../../config/product';
import type { SecureStoreVerify } from '../../platform/secureStorage';
import { SetupError, type SetupErrorCode } from './setupErrors';

export interface JiraConnectionDiagnostic {
  operation: string;
  host?: string;
  endpoint: string;
  credentialExists?: boolean;
  credentialReadable?: boolean;
  credentialLength?: number;
  status?: number;
  apiCode?: string;
  networkCategory?: string;
}

function hostFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

export function buildJiraConnectionDiagnostic(
  error: unknown,
  storage?: SecureStoreVerify,
): JiraConnectionDiagnostic {
  const apiError = error instanceof ApiError ? error : null;
  const endpoint = '/rest/api/3/myself';
  const host =
    hostFromUrl(apiError?.url) ||
    hostFromUrl(resolveJiraBaseUrl()) ||
    'altenar.atlassian.net';

  let networkCategory: string | undefined;
  if (apiError?.code === 'network_error') networkCategory = 'network';
  if (apiError?.code === 'tls_error') networkCategory = 'tls';

  return {
    operation: 'jira_connection_test',
    host,
    endpoint,
    credentialExists: storage?.exists,
    credentialReadable: storage?.readable,
    credentialLength: storage?.length,
    status: apiError?.status,
    apiCode: apiError?.code,
    networkCategory,
  };
}

export function mapJiraConnectionError(
  error: unknown,
  storage?: SecureStoreVerify,
): SetupError {
  const diagnostic = buildJiraConnectionDiagnostic(error, storage);

  if (storage && !storage.readable) {
    if (!storage.exists) {
      return new SetupError(
        'keychain_missing',
        'Metrio could not read the saved Jira credential from macOS Keychain.',
        { diagnostic: JSON.stringify(diagnostic) },
      );
    }
    return new SetupError(
      'keychain_error',
      'Metrio could not access macOS Keychain to read the Jira credential.',
      { diagnostic: JSON.stringify(diagnostic) },
    );
  }

  if (error instanceof SetupError) return error;

  if (error instanceof ApiError) {
    const code = mapApiErrorToSetupCode(error.code, error.status);
    const message = mapApiErrorToUserMessage(error);
    return new SetupError(code, message, { diagnostic: JSON.stringify(diagnostic) });
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('keychain') || message.includes('credential')) {
      return new SetupError(
        'keychain_error',
        'Metrio could not access macOS Keychain to read the Jira credential.',
        { diagnostic: JSON.stringify(diagnostic) },
      );
    }
  }

  return new SetupError(
    'jira_api_error',
    'Jira returned an unexpected error. Try again or contact support.',
    { diagnostic: JSON.stringify(diagnostic) },
  );
}

function mapApiErrorToSetupCode(apiCode: string, status?: number): SetupErrorCode {
  switch (apiCode) {
    case 'jira_auth_invalid':
      return 'jira_auth_invalid';
    case 'jira_access_denied':
      return 'jira_access_denied';
    case 'jira_endpoint_error':
      return 'jira_endpoint_error';
    case 'credential_missing':
      return 'keychain_missing';
    case 'keychain_error':
      return 'keychain_error';
    case 'network_error':
      return 'jira_network';
    case 'tls_error':
      return 'jira_tls';
    default:
      if (status === 401) return 'jira_auth_invalid';
      if (status === 403) return 'jira_access_denied';
      if (status === 404) return 'jira_endpoint_error';
      return 'jira_api_error';
  }
}

function mapApiErrorToUserMessage(error: ApiError): string {
  switch (error.code) {
    case 'jira_auth_invalid':
    case 'jira_api_error':
      if (error.status === 401) {
        return "Jira couldn't verify your email and API token. Check that the token was created from your own Atlassian account.";
      }
      break;
    case 'jira_access_denied':
      return 'Your Jira account is connected, but access to Jira API is blocked.';
    case 'jira_endpoint_error':
      return 'Metrio could not reach the expected Jira API endpoint. Contact support.';
    case 'credential_missing':
      return 'Metrio could not read the saved Jira credential from macOS Keychain.';
    case 'keychain_error':
      return 'Metrio could not access macOS Keychain to read the Jira credential.';
    case 'network_error':
      return "Metrio couldn't reach Jira. Check your connection and try again.";
    case 'tls_error':
      return 'Metrio could not establish a secure connection to Jira.';
    default:
      break;
  }

  if (error.status === 401) {
    return "Jira couldn't verify your email and API token. Check that the token was created from your own Atlassian account.";
  }
  if (error.status === 403) {
    return 'Your Jira account is connected, but access to Jira API is blocked.';
  }
  if (error.status === 404) {
    return 'Metrio could not reach the expected Jira API endpoint. Contact support.';
  }

  return 'Jira returned an unexpected error. Try again or contact support.';
}
