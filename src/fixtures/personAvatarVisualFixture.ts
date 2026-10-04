/**
 * Deterministic employee photos for VITE_VISUAL_FIXTURE=1 (Playwright).
 * Tiny PNGs — not production Bamboo assets.
 */

/** 2×2 PNG, orange */
const ORANGE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAAAtgE7IAAAAD0lEQVQI12P4z8BQwAADgAGK4n8YQAAAABJRU5ErkJggg==";

/** 2×2 PNG, teal */
const TEAL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAAAtgE7IAAAAD0lEQVQI12P4/xcEGAD0B0bY3x8nAAAAAElFTkSuQmCC";

const WITH_PHOTO: Record<string, string> = {
  "person-sam": ORANGE_PNG,
  "person-alex": TEAL_PNG,
  "person-01": ORANGE_PNG,
  "person-02": TEAL_PNG,
  "person-03": ORANGE_PNG,
};

/** Employees that intentionally have no Bamboo photo (initials only). */
const WITHOUT_PHOTO = new Set(["person-04", "person-05"]);

export function getVisualEmployeePhotoDataUrl(
  bambooEmployeeId: string,
): string | null | undefined {
  if (import.meta.env.VITE_VISUAL_FIXTURE !== "1") return undefined;
  if (WITHOUT_PHOTO.has(bambooEmployeeId)) return null;
  if (WITH_PHOTO[bambooEmployeeId]) return WITH_PHOTO[bambooEmployeeId];
  return null;
}
