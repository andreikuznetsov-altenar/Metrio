const FORBIDDEN_SCHEMES = /^(javascript|file|data|vbscript):/i;

export function isAllowedHttpsUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (FORBIDDEN_SCHEMES.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function hostMatchesAllowlist(
  url: string,
  patterns: string[] | undefined,
): boolean {
  if (!patterns?.length) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return patterns.some((pattern) => {
      const p = pattern.trim().toLowerCase();
      if (!p) return false;
      if (p.startsWith("*.")) {
        const suffix = p.slice(1);
        return host.endsWith(suffix) || host === p.slice(2);
      }
      return host === p || host.endsWith(`.${p}`);
    });
  } catch {
    return false;
  }
}
