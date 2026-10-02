import { openUrl } from '@tauri-apps/plugin-opener';

export async function openExternalUrl(url: string): Promise<void> {
  if (!url.trim()) return;
  if (import.meta.env.VITE_VISUAL_FIXTURE === "1" && typeof window !== "undefined") {
    (window as unknown as { __metrioLastOpenedUrl?: string }).__metrioLastOpenedUrl =
      url;
    return;
  }
  await openUrl(url);
}
