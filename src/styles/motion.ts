/** Keep in sync with drawer motion tokens in `tokens.css`. */
export const MOTION_DRAWER_OPEN_MS = 310;
export const MOTION_DRAWER_CLOSE_MS = 330;
export const MOTION_MODAL_MS = 180;

export function readMotionDrawerMs(): number {
  return readMotionDrawerCloseMs();
}

function readMotionToken(name: string, fallback: number): number {
  if (typeof document === "undefined") {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^([\d.]+)ms$/.exec(raw);
  return match ? Number(match[1]) : fallback;
}

export function readMotionDrawerOpenMs(): number {
  return readMotionToken("--motion-drawer-open", MOTION_DRAWER_OPEN_MS);
}

export function readMotionDrawerCloseMs(): number {
  return readMotionToken("--motion-drawer-close", MOTION_DRAWER_CLOSE_MS);
}

export function readMotionModalMs(): number {
  return readMotionToken("--motion-modal", MOTION_MODAL_MS);
}
