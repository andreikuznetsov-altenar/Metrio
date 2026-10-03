export function resolveMetrioApiBaseUrl(): string | null {
  const url = import.meta.env.VITE_METRIO_API_URL;
  if (typeof url !== "string" || !url.trim()) return null;
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://127.0.0.1")) {
    return null;
  }
  return trimmed;
}

export function resolveMetrioDevAuthSecret(): string | null {
  const secret = import.meta.env.VITE_METRIO_DEV_AUTH_SECRET;
  return typeof secret === "string" && secret.trim() ? secret.trim() : null;
}
