export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidWorkEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Altenar work email: *@altenar.com (trim + lowercase). */
export function isAltenarWorkEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return /^[^\s@]+@altenar\.com$/.test(normalized);
}

export function validateConnectInput(input: {
  workEmail: string;
  jiraToken: string;
  bambooApiKey: string;
}): string | null {
  if (!isAltenarWorkEmail(input.workEmail)) {
    return 'Use your @altenar.com work email.';
  }
  if (!input.jiraToken.trim()) return 'Enter your Jira API token.';
  if (!input.bambooApiKey.trim()) return 'Enter your BambooHR API key.';
  return null;
}
