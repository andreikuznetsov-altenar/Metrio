import type { DigestHistory } from "../domain/digests/digestHistory";
import type { DigestMetrics } from "../domain/digests/digestMetrics";
import type { OperationalDigest } from "../domain/digests/digestTypes";

export interface DigestUserPreferences {
  dailyBriefEnabled: boolean;
  weeklyDigestEnabled: boolean;
  showDailyOnHome: boolean;
  showWeeklyOnHome: boolean;
  notifyDailyBrief: boolean;
  notifyWeeklyDigest: boolean;
}

export interface DigestPersistedState {
  currentDaily?: OperationalDigest;
  currentWeekly?: OperationalDigest;
  history: DigestHistory;
  lastMetrics?: DigestMetrics;
  notifiedDailyId?: string;
  notifiedWeeklyId?: string;
}

export const DEFAULT_DIGEST_PREFERENCES: DigestUserPreferences = {
  dailyBriefEnabled: true,
  weeklyDigestEnabled: true,
  showDailyOnHome: true,
  showWeeklyOnHome: true,
  notifyDailyBrief: false,
  notifyWeeklyDigest: false,
};

export const EMPTY_DIGEST_STATE: DigestPersistedState = {
  history: { daily: [], weekly: [] },
};
