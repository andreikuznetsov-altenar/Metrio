import { openExternalUrl, parseExternalUrl } from "./openExternal";

/** True when `href` points outside the Metrio webview (a different origin than the app's own). */
export function isExternalHref(href: string, appOrigin: string): boolean {
  const parsed = parseExternalUrl(href);
  if (!parsed) return false;
  if (parsed.protocol === "mailto:") return true;
  return parsed.origin !== appOrigin;
}

/**
 * Defensive net: if any anchor with an external http(s)/mailto href ever slips through without its
 * own handler, send it to the system browser instead of letting the Metrio webview navigate.
 * Internal links (same origin, `#hash`, other schemes) are left alone. Returns an uninstall function.
 */
export function installExternalNavigationGuard(doc: Document = document): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    const anchor = target instanceof Element ? target.closest("a[href]") : null;
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    if (!isExternalHref(href, doc.defaultView?.location.origin ?? "")) return;
    event.preventDefault();
    void openExternalUrl(href).catch(() => undefined);
  };
  doc.addEventListener("click", onClick);
  return () => doc.removeEventListener("click", onClick);
}
