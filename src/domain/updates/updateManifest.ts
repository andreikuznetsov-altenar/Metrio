import { isNewerSemVer, parseSemVer } from "./semver";

export interface StaticUpdateManifest {
  version: string;
  notes?: string;
  pub_date?: string;
}

export function parseUpdateManifest(raw: unknown): StaticUpdateManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const version = (raw as { version?: unknown }).version;
  if (typeof version !== "string" || !parseSemVer(version)) return null;
  const notes = (raw as { notes?: unknown }).notes;
  const pub_date = (raw as { pub_date?: unknown }).pub_date;
  return {
    version,
    notes: typeof notes === "string" ? notes : undefined,
    pub_date: typeof pub_date === "string" ? pub_date : undefined,
  };
}

export function evaluateManifestUpdate(
  manifest: StaticUpdateManifest,
  currentVersion: string,
): { available: boolean; version: string; notes: string } {
  const available = isNewerSemVer(manifest.version, currentVersion);
  return {
    available,
    version: manifest.version,
    notes: sanitizeReleaseNotes(manifest.notes ?? ""),
  };
}

/** Plain text only — no HTML rendering in the client. */
export function sanitizeReleaseNotes(notes: string): string {
  return notes
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 8000);
}
