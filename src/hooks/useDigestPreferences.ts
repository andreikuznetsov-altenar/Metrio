import { useCallback, useEffect, useState } from "react";
import type { OperationalDigest } from "../domain/digests/digestTypes";
import type { DigestUserPreferences } from "../platform/digestPreferences";
import {
  loadPreferences,
  PREFERENCES_SAVED_EVENT,
  type AppPreferences,
} from "../platform/preferences";

export interface DigestHomeModel {
  daily?: OperationalDigest;
  weekly?: OperationalDigest;
  prefs: DigestUserPreferences;
}

export function useDigestPreferences(): {
  digest: DigestHomeModel | null;
  refresh: () => Promise<void>;
} {
  const [digest, setDigest] = useState<DigestHomeModel | null>(null);

  const refresh = useCallback(async () => {
    try {
      const prefs = await loadPreferences();
      setDigest({
        daily: prefs.digestState?.currentDaily,
        weekly: prefs.digestState?.currentWeekly,
        prefs: prefs.digests,
      });
    } catch {
      setDigest(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<AppPreferences>).detail;
      if (detail?.digestState) {
        setDigest({
          daily: detail.digestState.currentDaily,
          weekly: detail.digestState.currentWeekly,
          prefs: detail.digests,
        });
      } else {
        void refresh();
      }
    };
    window.addEventListener(PREFERENCES_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(PREFERENCES_SAVED_EVENT, onSaved);
  }, [refresh]);

  return { digest, refresh };
}
