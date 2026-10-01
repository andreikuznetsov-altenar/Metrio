export type SetupErrorCode =
  | 'invalid_email'
  | 'missing_jira_token'
  | 'missing_bamboo_key'
  | 'jira_not_configured'
  | 'bamboo_not_configured'
  | 'jira_invalid'
  | 'jira_auth_invalid'
  | 'jira_access_denied'
  | 'jira_endpoint_error'
  | 'jira_network'
  | 'jira_tls'
  | 'jira_api_error'
  | 'keychain_missing'
  | 'keychain_error'
  | 'jira_email_mismatch'
  | 'bamboo_invalid'
  | 'employee_not_found'
  | 'duplicate_employee'
  | 'reporting_restricted'
  | 'network'
  | 'unknown';

export class SetupError extends Error {
  readonly code: SetupErrorCode;
  readonly details?: Record<string, string>;

  constructor(code: SetupErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
