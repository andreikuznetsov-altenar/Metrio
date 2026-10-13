// @vitest-environment jsdom
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateProvider } from "../app/UpdateContext";
import { UpdatePrompt } from "../app/UpdatePrompt";
import { AboutSettingsPanel } from "../pages/settings/AboutSettingsPanel";
import {
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_STARTUP_CHECK_DELAY_MS,
  UPDATE_ENDPOINT,
  buildUpdateDiagnostic,
  categorizeUpdateError,
  checkForUpdatesNative,
  describeUpdateError,
  installNativeUpdate,
  readUpdateDiagnostic,
  scheduleUpdateChecks,
} from "../platform/metrioUpdater";

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  relaunch: vi.fn(async () => undefined),
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));

const RELEASE_INFO = {
  version: "0.1.1",
  commit: "abcdef1234",
  channel: "production",
  product_name: "Metrio",
};

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function renderApp() {
  return render(
    <UpdateProvider>
      <UpdatePrompt />
      <AboutSettingsPanel embedded />
    </UpdateProvider>,
  );
}

function availableUpdate(version = "0.2.0") {
  return {
    version,
    body: "Faster dashboards",
    downloadAndInstall: vi.fn(async (onEvent?: (event: unknown) => void) => {
      onEvent?.({ event: "Started", data: { contentLength: 100 } });
      onEvent?.({ event: "Finished" });
    }),
  };
}

describe("PASS 23 updater runtime", () => {
  beforeEach(() => {
    mocks.check.mockReset();
    mocks.relaunch.mockClear();
    mocks.invoke.mockReset();
    mocks.invoke.mockResolvedValue(RELEASE_INFO);
  });
  afterEach(() => cleanup());

  it("renders the current app version", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-meta")).toHaveTextContent("Version 0.1.1"));
  });

  it("reports 'You're up to date' when there is no update", async () => {
    mocks.check.mockResolvedValue(null);
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-check-updates")).toBeEnabled());
    fireEvent.click(screen.getByTestId("about-check-updates"));
    await waitFor(() =>
      expect(screen.getByTestId("about-update-status")).toHaveTextContent("You're up to date"),
    );
    expect(screen.queryByTestId("update-prompt")).toBeNull();
  });

  it("offers 'Update and restart' / 'Later' with canonical buttons when an update exists", async () => {
    mocks.check.mockResolvedValue(availableUpdate());
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-check-updates")).toBeEnabled());
    fireEvent.click(screen.getByTestId("about-check-updates"));

    const prompt = await screen.findByTestId("update-prompt");
    expect(within(prompt).getByText("Metrio 0.2.0 is ready to install.")).toBeInTheDocument();
    expect(within(prompt).getByRole("button", { name: "Update and restart" })).toHaveClass("btn--primary");
    expect(within(prompt).getByRole("button", { name: "Later" })).toHaveClass("btn--secondary");
    expect(prompt.closest(".metrio-modal")).not.toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("about-update-status")).toHaveTextContent("Update available");
  });

  it("'Later' dismisses the prompt without installing, and a new check offers it again", async () => {
    const update = availableUpdate();
    mocks.check.mockResolvedValue(update);
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-check-updates")).toBeEnabled());
    fireEvent.click(screen.getByTestId("about-check-updates"));
    const prompt = await screen.findByTestId("update-prompt");
    fireEvent.click(within(prompt).getByRole("button", { name: "Later" }));
    await waitFor(() => expect(screen.queryByTestId("update-prompt")).toBeNull());
    expect(update.downloadAndInstall).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("about-check-updates"));
    expect(await screen.findByTestId("update-prompt")).toBeInTheDocument();
  });

  it("'Update and restart' downloads, installs through the Tauri updater and relaunches", async () => {
    const update = availableUpdate();
    mocks.check.mockResolvedValue(update);
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-check-updates")).toBeEnabled());
    fireEvent.click(screen.getByTestId("about-check-updates"));
    const prompt = await screen.findByTestId("update-prompt");
    fireEvent.click(within(prompt).getByRole("button", { name: "Update and restart" }));
    await waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(1));
    expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
  });

  it("shows an understandable, non-fatal message when the check fails", async () => {
    mocks.check.mockRejectedValue(new Error("network request failed"));
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-check-updates")).toBeEnabled());
    fireEvent.click(screen.getByTestId("about-check-updates"));
    await waitFor(() =>
      expect(screen.getByTestId("about-update-status")).toHaveTextContent("Failed to check for updates"),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn't reach the update server/);
    expect(screen.queryByTestId("update-prompt")).toBeNull();
    expect(screen.getByTestId("about-check-updates")).toBeEnabled();
  });

  it("surfaces install failures and signature failures without crashing", async () => {
    const update = availableUpdate();
    update.downloadAndInstall.mockRejectedValue(new Error("signature verification failed"));
    mocks.check.mockResolvedValue(update);
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-check-updates")).toBeEnabled());
    fireEvent.click(screen.getByTestId("about-check-updates"));
    const prompt = await screen.findByTestId("update-prompt");
    fireEvent.click(within(prompt).getByRole("button", { name: "Update and restart" }));
    await waitFor(() =>
      expect(within(prompt).getByRole("alert")).toHaveTextContent("Update couldn't be verified."),
    );
    expect(mocks.relaunch).not.toHaveBeenCalled();
  });

  it("does not block the app when the updater and build info are unavailable at startup", async () => {
    mocks.invoke.mockRejectedValue(new Error("no tauri"));
    mocks.check.mockRejectedValue(new Error("offline"));
    render(
      <UpdateProvider>
        <UpdatePrompt />
        <div data-testid="app-content">usable</div>
      </UpdateProvider>,
    );
    expect(screen.getByTestId("app-content")).toHaveTextContent("usable");
    expect(screen.queryByTestId("update-prompt")).toBeNull();
  });

  it("keeps the manual check disabled in non-release builds", async () => {
    mocks.invoke.mockResolvedValue({ ...RELEASE_INFO, commit: "dev", channel: "development" });
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-update-status")).toHaveTextContent(/release builds/i));
    expect(screen.getByTestId("about-check-updates")).toBeDisabled();
    expect(mocks.check).not.toHaveBeenCalled();
  });
});

describe("PASS 23 scheduling and error copy", () => {
  it("checks once after startup and then every 6 hours until cleaned up", () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn(async () => undefined);
      const stop = scheduleUpdateChecks(run);
      expect(run).not.toHaveBeenCalled();
      vi.advanceTimersByTime(UPDATE_STARTUP_CHECK_DELAY_MS);
      expect(run).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS - UPDATE_STARTUP_CHECK_DELAY_MS);
      expect(run).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
      expect(run).toHaveBeenCalledTimes(3);
      stop();
      vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 2);
      expect(run).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a failing scheduled check never throws into the app", async () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn(async () => {
        throw new Error("boom");
      });
      scheduleUpdateChecks(run)();
      scheduleUpdateChecks(run);
      expect(() => vi.advanceTimersByTime(UPDATE_STARTUP_CHECK_DELAY_MS)).not.toThrow();
      await Promise.resolve();
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps updater failures to understandable messages without leaking internals", () => {
    expect(describeUpdateError(new Error("signature mismatch"), "check")).toBe("Update couldn't be verified.");
    expect(describeUpdateError(new Error("error sending request: dns"), "check")).toMatch(/update server/);
    expect(describeUpdateError(new Error("None of the fallback platforms were found"), "check")).toMatch(/isn't available right now/);
    expect(describeUpdateError(new Error("invalid json in manifest"), "check")).toMatch(/invalid/);
    expect(
      describeUpdateError(new Error("Could not fetch a valid release JSON from the remote"), "check"),
    ).toMatch(/isn't available right now/);
    expect(describeUpdateError(new Error("disk full"), "install")).toBe("Update couldn't be installed.");
    expect(describeUpdateError("weird", "check")).toBe(
      "Update information isn't available right now. Try again later.",
    );
  });

  it("is configured for the permanent GitHub Releases baseline", () => {
    const conf = JSON.parse(source("src-tauri/tauri.conf.json"));
    expect(conf.version).toBe(JSON.parse(source("package.json")).version);
    expect(conf.plugins.updater.endpoints).toEqual([
      "https://github.com/andreikuznetsov-altenar/Metrio/releases/latest/download/latest.json",
    ]);
    expect(conf.bundle.createUpdaterArtifacts).toBe(true);
    expect(conf.plugins.updater.pubkey).toMatch(/^[A-Za-z0-9+/=]{100,}$/);
    expect(Buffer.from(conf.plugins.updater.pubkey, "base64").toString("utf8")).toContain(
      "minisign public key",
    );
    expect(JSON.stringify(conf)).not.toMatch(/secret key|BEGIN/i);
    const pkg = JSON.parse(source("package.json"));
    // Versions are bumped automatically by the release pipeline; they only have to agree.
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(source("src-tauri/Cargo.toml")).toContain(`version = "${pkg.version}"`);
    expect(source("src/config/build.ts")).toContain(`|| '${pkg.version}'`);
  });

  it("latest.json carries the .sig CONTENT (not a URL) and the GitHub release asset URL", () => {
    const dir = mkdtempSync(join(tmpdir(), "metrio-updater-"));
    writeFileSync(join(dir, "Metrio.app.tar.gz"), "archive");
    writeFileSync(join(dir, "Metrio.app.tar.gz.sig"), "SIGNATURE-CONTENT\n");
    execFileSync("node", [resolve(process.cwd(), "scripts/generate-update-manifest.mjs"), dir], {
      env: { ...process.env, METRIO_UPDATER_PLATFORM: "darwin-aarch64" },
    });
    const manifest = JSON.parse(readFileSync(join(dir, "latest.json"), "utf8"));
    expect(manifest.version).toBe(JSON.parse(source("package.json")).version);
    expect(Object.keys(manifest.platforms)).toEqual(["darwin-aarch64"]);
    expect(manifest.platforms["darwin-aarch64"].signature).toBe("SIGNATURE-CONTENT");
    expect(manifest.platforms["darwin-aarch64"].url).toBe(
      `https://github.com/andreikuznetsov-altenar/Metrio/releases/download/v${manifest.version}/Metrio.app.tar.gz`,
    );
  });

  it("release workflow uses the updater secrets, generates and verifies latest.json, never inlines secrets", () => {
    const workflow = source(".github/workflows/release-macos.yml");
    expect(workflow).toContain("secrets.TAURI_SIGNING_PRIVATE_KEY");
    expect(workflow).toContain("secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD");
    expect(workflow).toContain("generate-update-manifest.mjs");
    expect(workflow).toContain("verify-updater-artifacts.mjs");
    expect(workflow).not.toMatch(/BEGIN (PRIVATE|CERTIFICATE)/);
  });

});

describe("PASS 23.2 update result semantics", () => {
  beforeEach(() => {
    mocks.check.mockReset();
    mocks.invoke.mockReset();
    mocks.invoke.mockImplementation(async (command: string) =>
      command === "app_get_updater_target" ? "darwin-aarch64" : RELEASE_INFO,
    );
    localStorage.clear();
  });
  afterEach(() => cleanup());

  it("treats a null plugin result (installed == latest) as up to date, never an error", async () => {
    mocks.check.mockResolvedValue(null);
    const result = await checkForUpdatesNative("0.1.1");
    expect(result).toEqual({ status: "up-to-date", currentVersion: "0.1.1" });
    expect(readUpdateDiagnostic()).toBeNull();
  });

  it("reports a newer remote version as update available", async () => {
    mocks.check.mockResolvedValue(availableUpdate("0.1.2"));
    const result = await checkForUpdatesNative("0.1.1");
    expect(result.status).toBe("available");
    expect(result.availableVersion).toBe("0.1.2");
  });

  it("a thrown plugin error is check_failed with a diagnostic, not 'up to date'", async () => {
    mocks.check.mockRejectedValue(new Error("network request failed"));
    const result = await checkForUpdatesNative("0.1.1");
    expect(result.status).toBe("error");
    expect(result.message).not.toMatch(/up to date/i);
    const diagnostic = readUpdateDiagnostic();
    expect(diagnostic).toMatchObject({
      phase: "check",
      category: "network",
      currentVersion: "0.1.1",
      endpoint: UPDATE_ENDPOINT,
      target: "darwin-aarch64",
    });
    expect(diagnostic?.rawError).toContain("network request failed");
  });

  it("an unsupported target is a diagnostic error with calm UI copy", async () => {
    const error = new Error(
      "None of the fallback platforms `[\"darwin-riscv64\"]` were found in the response `platforms` object",
    );
    mocks.check.mockRejectedValue(error);
    const result = await checkForUpdatesNative("0.1.1");
    expect(result.status).toBe("error");
    expect(result.message).toBe("Update information isn't available right now. Try again later.");
    expect(categorizeUpdateError(error)).toBe("target_unsupported");
    expect(readUpdateDiagnostic()?.category).toBe("target_unsupported");
  });

  it("diagnostics are truncated and contain no key or credential material", () => {
    const diagnostic = buildUpdateDiagnostic({
      error: new Error("x".repeat(2000)),
      phase: "check",
      currentVersion: "0.1.2",
      target: "darwin-aarch64",
    });
    expect(diagnostic.rawError.length).toBe(500);
    expect(Object.keys(diagnostic).sort()).toEqual(
      ["at", "category", "currentVersion", "endpoint", "phase", "rawError", "target"],
    );
  });

  it("the UI shows 'You're up to date' for 0.1.1 vs 0.1.1 and never falls back to a second check path", async () => {
    mocks.check.mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderApp();
    await waitFor(() => expect(screen.getByTestId("about-check-updates")).toBeEnabled());
    fireEvent.click(screen.getByTestId("about-check-updates"));
    await waitFor(() =>
      expect(screen.getByTestId("about-update-status")).toHaveTextContent("You're up to date"),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("records a diagnostic for install failures while keeping the calm UI message", async () => {
    const update = {
      currentVersion: "0.1.2",
      version: "0.1.3",
      downloadAndInstall: vi.fn(async () => {
        throw new Error("Read-only file system (os error 30)");
      }),
    };
    const progress = vi.fn();
    await expect(installNativeUpdate(update as never, progress)).rejects.toThrow(/Read-only/);
    expect(progress).toHaveBeenLastCalledWith({
      phase: "error",
      percent: null,
      message: "Update couldn't be installed.",
    });
    expect(readUpdateDiagnostic()).toMatchObject({
      phase: "install",
      category: "unknown",
      currentVersion: "0.1.2",
      target: "darwin-aarch64",
      endpoint: UPDATE_ENDPOINT,
      rawError: "Read-only file system (os error 30)",
    });
  });

  it("a successful install records no diagnostic", async () => {
    const update = { currentVersion: "0.1.2", version: "0.1.3", downloadAndInstall: vi.fn(async () => undefined) };
    await installNativeUpdate(update as never);
    expect(readUpdateDiagnostic()).toBeNull();
  });

  it("the built-in endpoint constant matches tauri.conf.json", () => {
    const conf = JSON.parse(source("src-tauri/tauri.conf.json"));
    expect(conf.plugins.updater.endpoints).toEqual([UPDATE_ENDPOINT]);
  });
});
