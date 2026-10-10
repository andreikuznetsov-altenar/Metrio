/**
 * react-pdf Image can fail hard on SVG data URLs that reference CSS font stacks
 * or unavailable bold faces. Keep optional images from killing the whole report.
 */

function decodeSvgDataUrl(src: string): string | null {
  const match = /^data:image\/svg\+xml(;charset=[^;,]+)?(;base64)?,(.*)$/i.exec(src);
  if (!match) return null;
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';
  try {
    if (isBase64) {
      if (typeof atob === 'function') {
        return atob(payload);
      }
      const Buf = (globalThis as { Buffer?: { from: (s: string, enc: string) => { toString: (enc: string) => string } } }).Buffer;
      if (Buf) {
        return Buf.from(payload, 'base64').toString('utf8');
      }
      return null;
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/** True when SVG markup is known-safe for @react-pdf/renderer Image. */
export function isReactPdfCompatibleSvgMarkup(svg: string): boolean {
  if (!svg.trim()) return false;
  // CSS font stacks / weights on <text> are a common packaged-render killer.
  // PDF branding must use real graphical assets, not live SVG text glyphs.
  if (/<text[\s>]/i.test(svg)) return false;
  if (/font-family\s*=/i.test(svg)) return false;
  if (/font-weight\s*=/i.test(svg)) return false;
  if (/style\s*=\s*["'][^"']*font-/i.test(svg)) return false;
  return true;
}

/**
 * Returns a data URL safe to pass to react-pdf <Image>, or null for initials/text fallback.
 * Accepts PNG/JPEG always. Accepts SVG only when markup is compatible.
 */
export function sanitizePdfImageSrc(src: string | null | undefined): string | null {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('data:image/png') ||
    trimmed.startsWith('data:image/jpeg') ||
    trimmed.startsWith('data:image/jpg') ||
    trimmed.startsWith('data:image/webp')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('data:image/svg+xml')) {
    const markup = decodeSvgDataUrl(trimmed);
    if (!markup || !isReactPdfCompatibleSvgMarkup(markup)) {
      return null;
    }
    return trimmed;
  }

  // Remote http(s) URLs are not used in packaged Metrio PDF payloads today.
  return null;
}
