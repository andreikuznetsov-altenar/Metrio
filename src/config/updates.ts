import type { BuildChannel } from "./build";

/** Optional HTTPS manifest used in tests or preflight; production app uses Tauri updater endpoints. */
export function getUpdateManifestUrl(channel: BuildChannel): string | null {
  if (channel !== "production") return null;
  const raw = import.meta.env.VITE_UPDATE_MANIFEST_URL;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.trim();
}
