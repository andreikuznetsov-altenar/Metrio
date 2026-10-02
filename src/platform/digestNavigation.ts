export const DIGEST_OPEN_EVENT = "metrio-open-digest";

export function openDigest(digestKind: "daily" | "weekly"): void {
  window.dispatchEvent(
    new CustomEvent(DIGEST_OPEN_EVENT, { detail: { digestKind } }),
  );
}
