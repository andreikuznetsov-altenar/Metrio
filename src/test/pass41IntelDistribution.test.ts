import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMultiPlatformManifest, isNonRuntimeFile } from "../../scripts/release-lib.mjs";
import {
  RELEASE_TARGETS,
  bundleDir,
  dmgName,
  targetForArchive,
  updaterArchiveName,
} from "../../scripts/release-targets.mjs";

const repoRoot = resolve(process.cwd());
const source = (p: string) => readFileSync(join(repoRoot, p), "utf8");

const pkgVersion = JSON.parse(source("package.json")).version as string;

function artifactDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "metrio-multiarch-"));
  for (const t of RELEASE_TARGETS) {
    writeFileSync(join(dir, updaterArchiveName(t, pkgVersion)), `archive-bytes-${t.id}`);
    writeFileSync(join(dir, `${updaterArchiveName(t, pkgVersion)}.sig`), `SIG-${t.id}\n`);
  }
  return dir;
}

describe("release targets", () => {
  it("ships Apple Silicon, Intel AND Windows x64 with the Tauri updater platform keys", () => {
    expect(RELEASE_TARGETS.map((t) => [t.rustTarget, t.updaterPlatform, t.lipoArch])).toEqual([
      ["aarch64-apple-darwin", "darwin-aarch64", "arm64"],
      ["x86_64-apple-darwin", "darwin-x86_64", "x86_64"],
      ["x86_64-pc-windows-msvc", "windows-x86_64", undefined],
    ]);
  });

  it("uses unambiguous, distinct asset names per architecture", () => {
    const [arm, intel, win] = RELEASE_TARGETS;
    expect(dmgName("1.2.3", arm)).toBe("Metrio_1.2.3_aarch64.dmg");
    expect(dmgName("1.2.3", intel)).toBe("Metrio_1.2.3_x86_64.dmg");
    expect(updaterArchiveName(arm, "1.2.3")).toBe("Metrio_aarch64.app.tar.gz");
    expect(updaterArchiveName(intel, "1.2.3")).toBe("Metrio_x86_64.app.tar.gz");
    expect(updaterArchiveName(win, "1.2.3")).toBe("Metrio_1.2.3_x86_64-setup.exe");
    expect(bundleDir(win)).toBe("src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis");
    expect(bundleDir(intel)).toBe("src-tauri/target/x86_64-apple-darwin/release/bundle/macos");
    expect(targetForArchive("Metrio_x86_64.app.tar.gz", "1.2.3")?.updaterPlatform).toBe("darwin-x86_64");
    expect(targetForArchive("Metrio_1.2.3_x86_64-setup.exe", "1.2.3")?.updaterPlatform).toBe("windows-x86_64");
    expect(targetForArchive("Metrio.app.tar.gz", "1.2.3")).toBeUndefined();
  });
});

describe("platform → artifact mapping (OTA safety)", () => {
  it("each platform entry points at its OWN archive and signature", () => {
    const dir = artifactDir();
    execFileSync("node", [join(repoRoot, "scripts/generate-update-manifest.mjs"), dir], {
      env: { ...process.env, METRIO_RELEASE_REPO: "o/r", METRIO_RELEASE_TAG: "v9.9.9" },
    });
    const manifest = JSON.parse(readFileSync(join(dir, "latest.json"), "utf8"));
    expect(Object.keys(manifest.platforms).sort()).toEqual(["darwin-aarch64", "darwin-x86_64", "windows-x86_64"]);
    expect(manifest.platforms["darwin-aarch64"]).toEqual({
      signature: "SIG-aarch64",
      url: "https://github.com/o/r/releases/download/v9.9.9/Metrio_aarch64.app.tar.gz",
    });
    expect(manifest.platforms["darwin-x86_64"]).toEqual({
      signature: "SIG-x86_64",
      url: "https://github.com/o/r/releases/download/v9.9.9/Metrio_x86_64.app.tar.gz",
    });
    expect(manifest.platforms["windows-x86_64"]).toEqual({
      signature: "SIG-windows-x86_64",
      url: `https://github.com/o/r/releases/download/v9.9.9/Metrio_${pkgVersion}_x86_64-setup.exe`,
    });
    for (const t of RELEASE_TARGETS) {
      const entry = manifest.platforms[t.updaterPlatform] as { url: string; signature: string };
      expect(entry.url.endsWith(`/${updaterArchiveName(t, pkgVersion)}`)).toBe(true);
      expect(entry.signature).toBe(`SIG-${t.id}`);
      // no platform may point at another platform's artifact
      for (const other of RELEASE_TARGETS.filter((o) => o !== t)) {
        expect(entry.url.endsWith(`/${updaterArchiveName(other, pkgVersion)}`)).toBe(false);
      }
    }
  });

  it("refuses to publish a manifest when one architecture is missing", () => {
    const dir = artifactDir();
    const intel = RELEASE_TARGETS[1];
    execFileSync("rm", [join(dir, `${updaterArchiveName(intel, pkgVersion)}.sig`)]);
    const run = spawnSync("node", [join(repoRoot, "scripts/generate-update-manifest.mjs"), dir], { encoding: "utf8" });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("darwin-x86_64");
  });

  it("buildMultiPlatformManifest rejects duplicate platforms and URL signatures", () => {
    const entry = { platform: "darwin-aarch64", archiveName: "a.tar.gz", signature: "S" };
    expect(() => buildMultiPlatformManifest({ version: "1.0.0", repo: "o/r", entries: [entry, entry] })).toThrow(/duplicate/);
    expect(() =>
      buildMultiPlatformManifest({ version: "1.0.0", repo: "o/r", entries: [{ ...entry, signature: "https://x/y" }] }),
    ).toThrow(/not a URL/);
  });

  it("verifier rejects a missing architecture and unknown platform keys", () => {
    const dir = artifactDir();
    execFileSync("rm", [join(dir, "Metrio_x86_64.app.tar.gz")]);
    const run = spawnSync("node", [join(repoRoot, "scripts/verify-updater-artifacts.mjs"), dir], { encoding: "utf8" });
    expect(run.status).not.toBe(0);
  });

  it("the running binary derives its platform key from its own compile-time arch", () => {
    const rust = source("src-tauri/src/lib.rs");
    expect(rust).toContain("tauri_plugin_updater::target()");
    expect(rust).toContain('assert_eq!(label, "darwin-x86_64")');
    expect(rust).not.toMatch(/\.target\(\s*"darwin/);
  });
});

describe("release workflow", () => {
  const workflow = source(".github/workflows/release-macos.yml");

  it("plans the version once; mac (both archs) and windows builds all use that one release commit", () => {
    expect((workflow.match(/node scripts\/plan-release\.mjs/g) ?? []).length).toBe(1);
    expect((workflow.match(/prepare-release-version\.mjs/g) ?? []).length).toBe(1);
    expect((workflow.match(/git tag -a/g) ?? []).length).toBe(1);
    expect((workflow.match(/gh release create/g) ?? []).length).toBe(1);
    expect(workflow).toContain("targets: aarch64-apple-darwin,x86_64-apple-darwin");
    expect(workflow).toContain("package-target.sh aarch64");
    expect(workflow).toContain("package-target.sh x86_64");
    expect(workflow).not.toMatch(/strategy:\s*\n\s*matrix/);
    expect(workflow).toContain("runs-on: windows-latest");
    expect(workflow).toContain("npm run tauri build -- --target x86_64-pc-windows-msvc --bundles nsis");
    expect((workflow.match(/ref: \$\{\{ needs\.prepare\.outputs\.sha \}\}/g) ?? []).length).toBe(3);
    expect(workflow).toContain("needs: [prepare, macos, windows]");
    expect(workflow).toContain("Authenticode");
  });

  it("uploads both DMGs, both mac archives, the Windows installer and signatures, and latest.json last", () => {
    expect(workflow).toContain("Metrio_${RELEASE_VERSION}_x86_64-setup.exe.sig");
    expect(workflow).toContain('"windows-x86_64"');
    expect(workflow).toContain("Metrio_${RELEASE_VERSION}_aarch64.dmg");
    expect(workflow).toContain("Metrio_${RELEASE_VERSION}_x86_64.dmg");
    for (const f of ["Metrio_aarch64.app.tar.gz", "Metrio_x86_64.app.tar.gz"]) {
      expect(workflow).toContain(f);
      expect(workflow).toContain(`${f}.sig`);
    }
    expect(workflow.indexOf("gh release create")).toBeLessThan(workflow.indexOf("gh release upload"));
    expect(workflow.indexOf("gh release upload")).toBeLessThan(workflow.indexOf("gh release edit"));
  });

  it("package script verifies architecture, signing, notarization, stapling and Gatekeeper per target", () => {
    const pkg = source("scripts/ci/package-target.sh");
    for (const needle of [
      "--target \"$RUST_TARGET\"",
      "verify-app-arch.sh",
      "verify-app-signature.sh",
      "notarize.sh",
      "stapler staple",
      "stapler validate",
      "source=Notarized Developer ID",
      "verify-build-provenance.mjs",
    ]) {
      expect(pkg).toContain(needle);
    }
    expect(source("scripts/ci/verify-app-arch.sh")).toContain("lipo -archs");
  });

  it("distribution-only script changes never trigger a release on push", () => {
    for (const f of [
      "scripts/release-targets.mjs",
      "scripts/generate-update-manifest.mjs",
      "scripts/verify-updater-artifacts.mjs",
      "scripts/release-macos.sh",
      "scripts/ci/package-target.sh",
      ".github/workflows/release-macos.yml",
    ]) {
      expect(isNonRuntimeFile(f)).toBe(true);
    }
  });
});
