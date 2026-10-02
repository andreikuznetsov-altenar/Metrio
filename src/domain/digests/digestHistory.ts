import type { OperationalDigest } from "./digestTypes";

const MAX_DAILY = 7;
const MAX_WEEKLY = 8;

export interface DigestHistory {
  daily: OperationalDigest[];
  weekly: OperationalDigest[];
}

export function trimDigestHistory(history: DigestHistory): DigestHistory {
  return {
    daily: history.daily.slice(-MAX_DAILY),
    weekly: history.weekly.slice(-MAX_WEEKLY),
  };
}

export function pushDigestHistory(
  history: DigestHistory,
  digest: OperationalDigest,
): DigestHistory {
  const next = { ...history };
  if (digest.kind === "daily") {
    const without = next.daily.filter((d) => d.id !== digest.id);
    next.daily = [...without, digest];
  } else {
    const without = next.weekly.filter((d) => d.id !== digest.id);
    next.weekly = [...without, digest];
  }
  return trimDigestHistory(next);
}
