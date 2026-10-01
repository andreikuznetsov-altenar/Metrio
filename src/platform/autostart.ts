import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

export async function applyLaunchAtLogin(enabled: boolean): Promise<void> {
  const currently = await isEnabled();
  if (enabled && !currently) {
    await enable();
  } else if (!enabled && currently) {
    await disable();
  }
}
