import { openUrl } from '@tauri-apps/plugin-opener';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** Parses and validates an outbound URL. Only http(s) and mailto may leave Metrio. */
export function parseExternalUrl(url: string): URL | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * The ONE way Metrio sends a URL outside the app.
 *
 * - packaged app: the Tauri opener plugin → the system default browser (never the Metrio webview);
 * - plain browser / dev / tests (no Tauri runtime): the opener when available, otherwise a safe
 *   `window.open(..., "noopener,noreferrer")`.
 * Only http(s) and mailto are accepted; anything else is ignored.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const parsed = parseExternalUrl(url);
  if (!parsed) return;
  const target = parsed.href;
  if (import.meta.env.VITE_VISUAL_FIXTURE === "1" && typeof window !== "undefined") {
    (window as unknown as { __metrioLastOpenedUrl?: string }).__metrioLastOpenedUrl = target;
    return;
  }
  if (isTauriRuntime()) {
    await openUrl(target);
    return;
  }
  try {
    await openUrl(target);
  } catch {
    if (typeof window !== 'undefined') window.open(target, '_blank', 'noopener,noreferrer');
  }
}
