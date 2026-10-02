import { vi } from "vitest";

const defaultPreferencesLoadResponse = {
  preferences: { schemaVersion: 6, setup: { completed: true } },
  source: "default" as const,
  warning: null,
};

export const invokeMock = vi.fn(async (command: string, _args?: Record<string, unknown>) => {
  switch (command) {
    case "preferences_load":
      return defaultPreferencesLoadResponse;
    case "preferences_save":
      return undefined;
    case "storage_get_warnings":
      return [];
    case "set_keep_running_in_tray":
      return undefined;
    default:
      return undefined;
  }
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, _args?: Record<string, unknown>) =>
    invokeMock(command, _args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => undefined),
}));
