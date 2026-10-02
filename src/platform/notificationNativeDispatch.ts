import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export interface NativeNotificationDescriptor {
  title: string;
  body: string;
}

export async function dispatchNativeNotification(
  input: NativeNotificationDescriptor,
): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const perm = await requestPermission();
    granted = perm === "granted";
  }
  if (!granted) {
    return false;
  }
  await sendNotification({ title: input.title, body: input.body });
  return true;
}
