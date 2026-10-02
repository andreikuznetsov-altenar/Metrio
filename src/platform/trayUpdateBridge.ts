import type { TrayBuildContext } from "./trayActionCenter";

let lastTrayContext: TrayBuildContext | null = null;

export function registerTrayContextForUpdate(context: TrayBuildContext): void {
  lastTrayContext = context;
}

export function getLastTrayContextForUpdate(): TrayBuildContext | null {
  return lastTrayContext;
}
