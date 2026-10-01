import { normalizeEmail } from './validation';

export type JiraEmailVerification = 'verified_email' | 'hidden_email';

export interface JiraIdentitySnapshot {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

export type JiraIdentityCheckResult =
  | { ok: true; state: JiraEmailVerification; identity: JiraIdentitySnapshot }
  | { ok: false; entered: string; jira: string };

export function verifyJiraEmailMatch(
  enteredEmail: string,
  identity: JiraIdentitySnapshot,
): JiraIdentityCheckResult {
  const jiraEmail = identity.emailAddress?.trim();
  if (!jiraEmail) {
    return { ok: true, state: 'hidden_email', identity };
  }
  if (normalizeEmail(enteredEmail) === normalizeEmail(jiraEmail)) {
    return { ok: true, state: 'verified_email', identity };
  }
  return { ok: false, entered: enteredEmail.trim(), jira: jiraEmail };
}
