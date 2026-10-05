/** Keep in sync with `--motion-drawer` in `tokens.css`. */
export const MOTION_DRAWER_MS = 240;

export function readMotionDrawerMs(): number {
  if (typeof document === "undefined") {
    return MOTION_DRAWER_MS;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--motion-drawer")
    .trim();
  const match = /^([\d.]+)ms$/.exec(raw);
  return match ? Number(match[1]) : MOTION_DRAWER_MS;
}
