/** Minimum issue history for Work History views (days). */
export const WORK_HISTORY_WINDOW_DAYS = 90;

/** Retain aggregate snapshot history (days). */
export const SNAPSHOT_RETENTION_DAYS = 740;

/**
 * Increment when bootstrap algorithm or output shape changes.
 * v6 (Signals V2): person-scoped historical flow is attributed to the contributor (as live rows
 * are), and rows carry reworked-cycle counts and raw cycle/execution duration samples.
 */
export const HISTORICAL_BOOTSTRAP_VERSION = 6;

/** Minimum days with data in each trend comparison window. */
export const MIN_TREND_COMPARISON_DAYS = 7;
