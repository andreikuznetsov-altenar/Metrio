export interface SemVerParts {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
}

const CORE_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseSemVer(input: string): SemVerParts | null {
  const trimmed = input.trim().replace(/^v/i, "");
  const match = CORE_RE.exec(trimmed);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? "",
  };
}

/** Returns 1 if a > b, -1 if a < b, 0 if equal (semver, not lexicographic). */
export function compareSemVer(a: string, b: string): number {
  const left = parseSemVer(a);
  const right = parseSemVer(b);
  if (!left || !right) {
    throw new Error("Invalid semantic version");
  }
  if (left.major !== right.major) return left.major > right.major ? 1 : -1;
  if (left.minor !== right.minor) return left.minor > right.minor ? 1 : -1;
  if (left.patch !== right.patch) return left.patch > right.patch ? 1 : -1;
  if (!left.prerelease && !right.prerelease) return 0;
  if (!left.prerelease) return 1;
  if (!right.prerelease) return -1;
  if (left.prerelease === right.prerelease) return 0;
  return left.prerelease > right.prerelease ? 1 : -1;
}

export function isNewerSemVer(candidate: string, current: string): boolean {
  try {
    return compareSemVer(candidate, current) > 0;
  } catch {
    return false;
  }
}
