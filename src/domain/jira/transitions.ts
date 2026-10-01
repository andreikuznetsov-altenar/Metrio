import { normalizeTeamIdentity } from './users';

export function containsNormalized(value: string, needle: string): boolean {
  return normalizeTeamIdentity(value).includes(normalizeTeamIdentity(needle));
}

export function isTodoLike(value: string): boolean {
  const normalized = normalizeTeamIdentity(value);
  return (
    normalized === 'todo' ||
    normalized === 'to do' ||
    normalized === 'backlog' ||
    normalized === 'open' ||
    normalized === 'selected for development'
  );
}

export function getStageRank(statusValue: string): number {
  const status = normalizeTeamIdentity(statusValue || '');

  if (
    status === 'todo' ||
    status === 'to do' ||
    status === 'open' ||
    status === 'backlog' ||
    status === 'selected for development'
  ) {
    return 1;
  }

  if (
    status.includes('in progress') ||
    status.includes('hold') ||
    status.includes('blocked')
  ) {
    return 2;
  }

  if (status === 'review' || status.includes('in review')) {
    return 3;
  }

  if (
    status.includes('done') ||
    status.includes('approved') ||
    status.includes('published') ||
    status.includes('closed')
  ) {
    return 4;
  }

  return 0;
}

export function isReverseTransition(fromValue: string, toValue: string): boolean {
  const fromRank = getStageRank(fromValue);
  const toRank = getStageRank(toValue);

  if (!fromRank || !toRank) return false;
  return toRank < fromRank;
}

export function isTodoToProgressTransition(fromValue: string, toValue: string): boolean {
  return isTodoLike(fromValue) && containsNormalized(toValue, 'in progress');
}

export function isProgressToReviewTransition(fromValue: string, toValue: string): boolean {
  return (
    containsNormalized(fromValue, 'in progress') &&
    (containsNormalized(toValue, 'in review') || normalizeTeamIdentity(toValue) === 'review')
  );
}

export function isReviewToDoneTransition(fromValue: string, toValue: string): boolean {
  return (
    (containsNormalized(fromValue, 'in review') || normalizeTeamIdentity(fromValue) === 'review') &&
    (containsNormalized(toValue, 'done') || containsNormalized(toValue, 'approved'))
  );
}

export function isProgressToHoldTransition(fromValue: string, toValue: string): boolean {
  return (
    containsNormalized(fromValue, 'in progress') &&
    (containsNormalized(toValue, 'on hold') || containsNormalized(toValue, 'blocked'))
  );
}
