import { openUrl } from '@tauri-apps/plugin-opener';

export async function openExternalUrl(url: string): Promise<void> {
  if (!url.trim()) return;
  await openUrl(url);
}
