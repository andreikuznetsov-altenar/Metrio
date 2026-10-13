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
  describeUpdateError,
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
    expect(describeUpdateError(new Error("None of the fallback platforms were found"), "check")).toMatch(/for this Mac/);
    expect(describeUpdateError(new Error("invalid json in manifest"), "check")).toMatch(/invalid/);
    expect(describeUpdateError(new Error("disk full"), "install")).toBe("Update couldn't be installed.");
    expect(describeUpdateError("weird", "check")).toBe("Unable to check for updates.");
  });

  it("is configured for the permanent GitHub Releases baseline", () => {
    const conf = JSON.parse(source("src-tauri/tauri.conf.json"));
    expect(conf.version).toBe("0.1.1");
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
    expect(pkg.version).toBe("0.1.1");
    expect(source("src-tauri/Cargo.toml")).toMatch(/^version = "0\.1\.1"/m);
  });

  it("latest.json carries the .sig CONTENT (not a URL) and the GitHub release asset URL", () => {
    const dir = mkdtempSync(join(tmpdir(), "metrio-updater-"));
    writeFileSync(join(dir, "Metrio.app.tar.gz"), "archive");
    writeFileSync(join(dir, "Metrio.app.tar.gz.sig"), "SIGNATURE-CONTENT\n");
    execFileSync("node", [resolve(process.cwd(), "scripts/generate-update-manifest.mjs"), dir], {
      env: { ...process.env, METRIO_UPDATER_PLATFORM: "darwin-aarch64" },
    });
    const manifest = JSON.parse(readFileSync(join(dir, "latest.json"), "utf8"));
    expect(manifest.version).toBe("0.1.1");
    expect(manifest.platforms["darwin-aarch64"].signature).toBe("SIGNATURE-CONTENT");
    expect(manifest.platforms["darwin-aarch64"].url).toBe(
      "https://github.com/andreikuznetsov-altenar/Metrio/releases/download/v0.1.1/Metrio.app.tar.gz",
    );
  });

  it("release workflow is tag-driven, uses the updater secrets and never inlines secret values", () => {
    const workflow = source(".github/workflows/release-macos.yml");
    expect(workflow).toMatch(/tags:\s*\n\s*- "v\*"/);
    expect(workflow).toContain("secrets.TAURI_SIGNING_PRIVATE_KEY");
    expect(workflow).toContain("secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD");
    expect(workflow).toContain("generate-update-manifest.mjs");
    expect(workflow).toContain("verify-updater-artifacts.mjs");
    expect(workflow).not.toMatch(/dW50cnVzdGVk|BEGIN [A-Z ]*PRIVATE/);
  });
});
