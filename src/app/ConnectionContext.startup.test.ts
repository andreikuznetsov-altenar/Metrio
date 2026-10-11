import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveStartupBootstrapForConnection } from "./ConnectionContext";
import { bootstrapProductionSession } from "./appSession";
import {
  resetDocFixtureModeCacheForTests,
  setDocFixtureModeForTests,
} from "../platform/docFixtures";

vi.mock("./appSession", () => ({
  bootstrapProductionSession: vi.fn(async () => ({ kind: "ready" })),
  SESSION_STORAGE_ERROR_MESSAGE: "Unable to restore the saved connection.",
}));

vi.mock("./bootDiagnostics", () => ({
  bootLog: vi.fn(),
  bootLogError: vi.fn(),
  getLastBootStage: vi.fn(() => "test"),
}));

describe("ConnectionProvider startup contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDocFixtureModeCacheForTests();
  });

  it("bypasses production bootstrap when packaged doc fixtures are enabled", async () => {
    setDocFixtureModeForTests({ enabled: true, role: "manager" });

    const result = await resolveStartupBootstrapForConnection();

    expect(result).toBeNull();
    expect(bootstrapProductionSession).not.toHaveBeenCalled();
  });

  it("uses production bootstrap when doc fixtures are disabled", async () => {
    setDocFixtureModeForTests({ enabled: false, role: "lead" });

    const result = await resolveStartupBootstrapForConnection();

    expect(result).toEqual({ kind: "ready" });
    expect(bootstrapProductionSession).toHaveBeenCalledTimes(1);
  });
});
