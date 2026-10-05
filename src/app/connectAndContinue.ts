import { applyProductConfig, resolveBambooSubdomain, resolveJiraBaseUrl } from '../config/product';
import {
  buildPersonalLimitedResult,
  isDuplicateEmployeeError,
  isEmployeeNotFound,
  isReportingRestricted,
} from '../domain/setup/bambooIdentity';
import { mapBambooConnectionError } from '../domain/setup/bambooConnectionErrors';
import { verifyJiraEmailMatch } from '../domain/setup/jiraIdentity';
import { mapJiraConnectionError } from '../domain/setup/jiraConnectionErrors';
import { SetupError } from '../domain/setup/setupErrors';
import { normalizeEmail, validateConnectInput } from '../domain/setup/validation';
import { BambooClient } from '../services/bamboo/bambooClient';
import { detectTeam } from '../services/bamboo/teamDetection';
import { JiraClient } from '../services/jira/jiraClient';
import {
  loadPreferencesForMerge,
  savePreferences,
  syncWorkEmailFields,
  type StoredJiraIdentity,
} from '../platform/preferences';
import {
  SECRET_KEYS,
  secureStoreSet,
  secureStoreVerify,
} from '../platform/secureStorage';
import { persistConnectionConfig } from './connectionStorage';
import { resetAvatarSession } from '../services/bamboo/bambooAvatarService';

export interface ConnectFormInput {
  workEmail: string;
  jiraToken: string;
  bambooApiKey: string;
}

export type ConnectFieldError = 'workEmail' | 'jiraToken' | 'bambooApiKey' | 'form';

export class ConnectError extends Error {
  readonly field: ConnectFieldError;

  constructor(message: string, field: ConnectFieldError) {
    super(message);
    this.name = 'ConnectError';
    this.field = field;
  }
}

function fieldForSetupError(code: SetupError['code']): ConnectFieldError {
  switch (code) {
    case 'invalid_email':
    case 'jira_email_mismatch':
      return 'workEmail';
    case 'missing_jira_token':
    case 'jira_invalid':
    case 'jira_auth_invalid':
    case 'jira_access_denied':
    case 'jira_endpoint_error':
    case 'jira_network':
    case 'jira_tls':
    case 'jira_api_error':
    case 'keychain_missing':
    case 'keychain_error':
      return 'jiraToken';
    case 'missing_bamboo_key':
    case 'bamboo_invalid':
    case 'bamboo_not_configured':
      return 'bambooApiKey';
    case 'employee_not_found':
    case 'duplicate_employee':
    case 'reporting_restricted':
    default:
      return 'form';
  }
}

export async function connectAndContinue(input: ConnectFormInput): Promise<void> {
  const validationMessage = validateConnectInput(input);
  if (validationMessage) {
    const field: ConnectFieldError = validationMessage.includes('@altenar.com')
      ? 'workEmail'
      : validationMessage.includes('Jira')
        ? 'jiraToken'
        : validationMessage.includes('Bamboo')
          ? 'bambooApiKey'
          : 'form';
    throw new ConnectError(validationMessage, field);
  }

  const workEmail = normalizeEmail(input.workEmail);
  const jiraToken = input.jiraToken.trim();
  const bambooApiKey = input.bambooApiKey.trim();
  const jiraBaseUrl = resolveJiraBaseUrl();
  const bambooSubdomain = resolveBambooSubdomain();

  if (import.meta.env.VITE_VISUAL_FIXTURE === "1" && jiraToken === "bad") {
    throw new ConnectError("Could not verify your Jira API token.", "jiraToken");
  }

  await secureStoreSet(SECRET_KEYS.JIRA_API_TOKEN, jiraToken);
  await secureStoreSet(SECRET_KEYS.BAMBOO_API_TOKEN, bambooApiKey);

  let jiraIdentity: StoredJiraIdentity;
  try {
    const jiraClient = new JiraClient({ baseUrl: jiraBaseUrl, email: workEmail });
    const identity = await jiraClient.testConnection();
    const emailCheck = verifyJiraEmailMatch(workEmail, identity);
    if (!emailCheck.ok) {
      throw new SetupError(
        'jira_email_mismatch',
        'Work email must match the email on your Jira account.',
      );
    }
    jiraIdentity = {
      accountId: identity.accountId,
      displayName: identity.displayName,
      emailAddress: identity.emailAddress || workEmail,
      verification: emailCheck.state,
    };
  } catch (error) {
    const mapped =
      error instanceof SetupError
        ? error
        : mapJiraConnectionError(error, await secureStoreVerify(SECRET_KEYS.JIRA_API_TOKEN));
    throw new ConnectError(mapped.message, fieldForSetupError(mapped.code));
  }

  const bambooClient = new BambooClient({ subdomain: bambooSubdomain });
  try {
    await bambooClient.testConnection();
  } catch (error) {
    const mapped = mapBambooConnectionError(error);
    throw new ConnectError(mapped.message, fieldForSetupError(mapped.code));
  }

  let teamDetection = await detectTeam(bambooClient, workEmail);

  if (isEmployeeNotFound(teamDetection)) {
    throw new ConnectError(
      "We couldn't find your employee record in BambooHR for this email.",
      'workEmail',
    );
  }

  if (isDuplicateEmployeeError(teamDetection)) {
    throw new ConnectError(
      'Multiple BambooHR profiles match this email. Contact HR to resolve duplicates.',
      'workEmail',
    );
  }

  if (isReportingRestricted(teamDetection)) {
    teamDetection = buildPersonalLimitedResult(teamDetection);
  }

  if (!teamDetection.ok) {
    throw new ConnectError(
      teamDetection.error ||
        'BambooHR connected, but your team profile could not be loaded.',
      'form',
    );
  }

  const prefs = applyProductConfig({
    ...(await loadPreferencesForMerge()),
    ...syncWorkEmailFields(workEmail),
    jiraIdentity,
    teamDetection,
    setup: { completed: true },
    credentials: {
      jiraConfigured: true,
      bambooConfigured: true,
      migrationVersion: 1,
    },
  });

  resetAvatarSession();
  await savePreferences(prefs);
  await persistConnectionConfig({ workEmail }, { jiraToken, bambooApiKey });
}
