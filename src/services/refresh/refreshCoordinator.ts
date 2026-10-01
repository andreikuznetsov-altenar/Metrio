/** Coalesce overlapping refresh requests (background events, manual refresh, resume). */
export function createCoalescedRefresh(
  runRefresh: () => Promise<void>,
): () => Promise<void> {
  let inFlight: Promise<void> | null = null;
  let scheduled = false;

  return async () => {
    if (inFlight) {
      scheduled = true;
      return inFlight;
    }

    inFlight = (async () => {
      do {
        scheduled = false;
        await runRefresh();
      } while (scheduled);
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };
};
