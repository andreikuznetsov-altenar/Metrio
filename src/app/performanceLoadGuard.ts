export const PERFORMANCE_OVERLAY_MIN_MS = 350;

export function isLatestPerformanceRequest(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId;
}
