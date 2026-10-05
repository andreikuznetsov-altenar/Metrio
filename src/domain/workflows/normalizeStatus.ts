import { normalizeTeamIdentity } from '../jira/users';

export function normalizeStatusKey(status: string): string {
  return normalizeTeamIdentity(status || '');
}
