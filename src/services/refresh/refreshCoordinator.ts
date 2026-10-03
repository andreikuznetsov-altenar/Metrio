import {
  noteRefreshCoalesced,
  noteRefreshRequested,
} from "../../platform/observability/observabilityStore";

/** Coalesce overlapping refresh requests (background events, manual refresh, resume). */
export function createCoalescedRefresh(
  runRefresh: () => Promise<void>,
): () => Promise<void> {
  let inFlight: Promise<void> | null = null;
  let scheduled = false;

  return async () => {
    noteRefreshRequested();
    if (inFlight) {
      scheduled = true;
      noteRefreshCoalesced();
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
