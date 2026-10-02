import type { AppPreferences } from '../../platform/preferences';
import type { FeedbackConfidentiality } from '../survey/types';

/** Product rule for anonymous aggregated views — not company HR policy. */
export const MIN_ANONYMOUS_GROUP_SIZE = 3;

export function confidentialityLabel(
  mode: FeedbackConfidentiality | undefined,
  prefs: Pick<AppPreferences['google'], 'emailCollectionMode'>,
): string {
  const verified = prefs.emailCollectionMode === 'VERIFIED';
  if (mode === 'anonymous_aggregated') {
    return verified
      ? 'Collected via verified Google account — responses are aggregated in Metrio only when the minimum group size is met. This is not anonymous to Google.'
      : `Aggregated results shown when at least ${MIN_ANONYMOUS_GROUP_SIZE} responses are received.`;
  }
  if (mode === 'confidential_named') {
    return 'Confidential to authorized managers — individual responses may be visible.';
  }
  return 'Identified responses — tied to recipient email in delivery records.';
}

export function canShowAggregatedResults(responseCount: number): boolean {
  return responseCount >= MIN_ANONYMOUS_GROUP_SIZE;
}
