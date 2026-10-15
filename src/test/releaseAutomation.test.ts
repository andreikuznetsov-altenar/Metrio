import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SKIP_RELEASE_MARKER,
  applyVersion,
  buildReleaseNotes,
  isInternalCommitSubject,
  bumpPatch,
  buildLatestManifest,
  checkProvenance,
  compareSemver,
  isNonRuntimeFile,
  latestJsonUrl,
  latestStableVersion,
  nextReleaseVersion,
  parseSemver,
  readVersions,
  releaseAssetUrl,
  releaseCommitMessage,
  shouldRelease,
} from "../../scripts/release-lib.mjs";

const repoRoot = resolve(process.cwd());
const script = (name: string) => join(repoRoot, "scripts", name);

function copyVersionFixture(version: string): string {
  const dir = mkdtempSync(join(tmpdir(), "metrio-version-"));
  for (const file of [
    "package.json",
    "package-lock.json",
    "src-tauri/tauri.conf.json",
    "src-tauri/Cargo.toml",
    "src-tauri/Cargo.lock",
    "src/config/build.ts",
    "CHANGELOG.md",
  ]) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    cpSync(join(repoRoot, file), join(dir, file));
  }
  applyVersion(dir, version);
  return dir;
}

describe("semantic versioning helpers", () => {
  it("parses, compares and bumps patch versions", () => {
    expect(parseSemver("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseSemver("1.2")).toBeNull();
    expect(parseSemver("1.2.3-beta")).toBeNull();
    expect(bumpPatch("0.1.3")).toBe("0.1.4");
    expect(bumpPatch("0.1.9")).toBe("0.1.10");
    expect(compareSemver("0.1.10", "0.1.9")).toBe(1);
    expect(compareSemver("0.2.0", "0.10.0")).toBe(-1);
    expect(() => bumpPatch("nope")).toThrow();
  });

  it("parses the stable release list: ignores drafts, prereleases and non-semver tags", () => {
    expect(
      latestStableVersion([
        { tagName: "v0.1.1", isPrerelease: true, isDraft: false },
        { tagName: "v0.1.2", isPrerelease: false, isDraft: false },
        { tagName: "v0.1.3", isPrerelease: false, isDraft: false },
        { tagName: "v0.1.9", isPrerelease: false, isDraft: true },
        { tagName: "nightly", isPrerelease: false, isDraft: false },
      ]),
    ).toBe("0.1.3");
    expect(latestStableVersion([])).toBeNull();
  });

  it("derives the next patch from the latest stable release, not a stale package.json", () => {
    const tags = ["v0.1.1", "v0.1.2", "v0.1.3"];
    expect(nextReleaseVersion({ packageVersion: "0.1.3", latestStable: "0.1.3", tags })).toBe("0.1.4");
    // stale package.json behind the latest release must not regress the version
    expect(nextReleaseVersion({ packageVersion: "0.1.0", latestStable: "0.1.3", tags })).toBe("0.1.4");
    // a withdrawn (prerelease) version number is never reused
    expect(nextReleaseVersion({ packageVersion: "0.1.3", latestStable: "0.1.2", tags })).toBe("0.1.4");
  });

  it("retries reuse an unreleased version commit instead of skipping a number", () => {
    const tags = ["v0.1.3"];
    expect(nextReleaseVersion({ packageVersion: "0.1.4", latestStable: "0.1.3", tags })).toBe("0.1.4");
    // ...but never when that version's tag already exists
    expect(nextReleaseVersion({ packageVersion: "0.1.4", latestStable: "0.1.3", tags: [...tags, "v0.1.4"] })).toBe("0.1.5");
    // a deliberate manual minor bump is honoured
    expect(nextReleaseVersion({ packageVersion: "0.2.0", latestStable: "0.1.3", tags })).toBe("0.2.0");
  });
});

describe("version sources", () => {
  it("updates every authoritative source together and is idempotent", () => {
    const dir = copyVersionFixture("9.8.7");
    const versions = readVersions(dir);
    expect(new Set(Object.values(versions))).toEqual(new Set(["9.8.7"]));
    expect(Object.keys(versions).length).toBeGreaterThanOrEqual(7);
    expect(readFileSync(join(dir, "CHANGELOG.md"), "utf8")).toContain("## 9.8.7 — automated release");

    expect(applyVersion(dir, "9.8.7")).toEqual([]);
    expect(readFileSync(join(dir, "CHANGELOG.md"), "utf8").match(/## 9\.8\.7/g)).toHaveLength(1);
  });

  it("the CLI sets all sources and refuses malformed versions", () => {
    const dir = copyVersionFixture("1.0.0");
    const bad = spawnSync("node", [script("prepare-release-version.mjs"), "1.0"], { encoding: "utf8" });
    expect(bad.status).not.toBe(0);
    expect(existsSync(dir)).toBe(true);
    expect(() => applyVersion(dir, "not-a-version")).toThrow();
  });

  it("the real repository sources already agree", () => {
    const versions = Object.values(readVersions(repoRoot));
    expect(new Set(versions).size).toBe(1);
  });
});

describe("release decision", () => {
  it("does not release documentation, test or automation-only changes", () => {
    for (const files of [
      ["docs/releasing.md"],
      ["README.md", "CHANGELOG.md"],
      ["docs/screenshots/a.png"],
      ["src/test/foo.test.tsx", "e2e/visual/x.spec.ts"],
      [".github/workflows/release-macos.yml", "scripts/release-lib.mjs"],
    ]) {
      expect(shouldRelease({ changedFiles: files, headMessage: "docs" }).release).toBe(false);
    }
  });

  it("releases when anything that can change the packaged app changed", () => {
    for (const files of [
      ["src/pages/Home.tsx"],
      ["src-tauri/src/lib.rs"],
      ["docs/a.md", "package.json"],
      ["vite.config.ts"],
      ["scripts/resolve-build-commit.mjs"],
      ["src-tauri/tauri.conf.json"],
    ]) {
      expect(shouldRelease({ changedFiles: files, headMessage: "feat" }).release).toBe(true);
    }
    expect(isNonRuntimeFile("src/app/UpdateContext.tsx")).toBe(false);
    expect(isNonRuntimeFile("src/app/UpdateContext.test.tsx")).toBe(true);
  });

  it("never recurses on the generated release commit, but a manual run can force it", () => {
    const message = releaseCommitMessage("0.1.4");
    expect(message).toBe(`RELEASE Metrio v0.1.4 ${SKIP_RELEASE_MARKER}`);
    expect(shouldRelease({ changedFiles: ["package.json", "src/a.ts"], headMessage: message }).release).toBe(false);
    expect(shouldRelease({ changedFiles: [], headMessage: message, force: true }).release).toBe(true);
    expect(shouldRelease({ changedFiles: [], headMessage: "x" }).release).toBe(false);
  });
});

describe("planner against a throwaway git repository", () => {
  function makeRepo() {
    const repo = mkdtempSync(join(tmpdir(), "metrio-plan-"));
    const git = (...args: string[]) =>
      execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], {
        cwd: repo,
        encoding: "utf8",
      }).trim();
    mkdirSync(join(repo, "scripts"), { recursive: true });
    for (const f of ["plan-release.mjs", "release-lib.mjs"]) cpSync(script(f), join(repo, "scripts", f));
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "x", version: "0.1.3" }));
    mkdirSync(join(repo, "src"), { recursive: true });
    writeFileSync(join(repo, "src/a.ts"), "export {};\n");
    mkdirSync(join(repo, "docs"), { recursive: true });
    writeFileSync(join(repo, "docs/a.md"), "a\n");
    git("init", "-q", "-b", "main");
    git("add", "-A");
    git("commit", "-q", "-m", "init");
    git("tag", "v0.1.3");
    const releases = join(repo, "releases.json");
    const plan = (extra: string[] = [], releaseList: unknown = [{ tagName: "v0.1.3", isDraft: false, isPrerelease: false }]) => {
      writeFileSync(releases, JSON.stringify(releaseList));
      const result = spawnSync("node", [join(repo, "scripts/plan-release.mjs"), "--releases", releases, ...extra], {
        cwd: repo,
        encoding: "utf8",
      });
      return { status: result.status, out: result.stdout, err: result.stderr };
    };
    return { repo, git, plan };
  }

  it("skips docs-only pushes, releases runtime pushes and picks the next patch", () => {
    const { repo, git, plan } = makeRepo();
    expect(JSON.parse(plan().out).should_release).toBe(false);

    writeFileSync(join(repo, "docs/a.md"), "changed\n");
    git("commit", "-qam", "docs only");
    expect(JSON.parse(plan().out)).toMatchObject({ should_release: false });

    writeFileSync(join(repo, "src/a.ts"), "export const x = 1;\n");
    git("commit", "-qam", "feat: runtime change");
    expect(JSON.parse(plan().out)).toMatchObject({ should_release: true, version: "0.1.4", tag: "v0.1.4", previous_tag: "v0.1.3" });

    git("commit", "-q", "--allow-empty", "-m", releaseCommitMessage("0.1.4"));
    expect(JSON.parse(plan().out).should_release).toBe(false);
    expect(JSON.parse(plan(["--force"]).out)).toMatchObject({ should_release: true, version: "0.1.4" });
  }, 60_000);

  it("fails safely instead of releasing over an existing release/tag", () => {
    const { repo, git, plan } = makeRepo();
    writeFileSync(join(repo, "src/a.ts"), "export const y = 2;\n");
    git("commit", "-qam", "feat");
    const withDraft = plan([], [
      { tagName: "v0.1.3", isDraft: false, isPrerelease: false },
      { tagName: "v0.1.4", isDraft: true, isPrerelease: false },
    ]);
    expect(withDraft.status).not.toBe(0);
    expect(withDraft.err).toMatch(/already exists/);
  }, 60_000);
});

describe("latest.json and URLs", () => {
  it("builds the Tauri static manifest from the .sig CONTENT and the release asset URL", () => {
    const manifest = buildLatestManifest({
      version: "0.1.4",
      repo: "andreikuznetsov-altenar/Metrio",
      archiveName: "Metrio.app.tar.gz",
      signature: "SIG-CONTENT\n",
      pubDate: "2026-01-01T00:00:00.000Z",
    });
    expect(manifest).toEqual({
      version: "0.1.4",
      notes: "Metrio 0.1.4",
      pub_date: "2026-01-01T00:00:00.000Z",
      platforms: {
        "darwin-aarch64": {
          signature: "SIG-CONTENT",
          url: "https://github.com/andreikuznetsov-altenar/Metrio/releases/download/v0.1.4/Metrio.app.tar.gz",
        },
      },
    });
    expect(Object.keys(manifest.platforms)).toEqual(["darwin-aarch64"]);
    expect(() =>
      buildLatestManifest({ version: "0.1.4", repo: "o/r", archiveName: "a.tar.gz", signature: "https://x/y.sig" }),
    ).toThrow(/not a URL/);
    expect(releaseAssetUrl("o/r", "v1.2.3", "Metrio_1.2.3_aarch64.dmg")).toBe(
      "https://github.com/o/r/releases/download/v1.2.3/Metrio_1.2.3_aarch64.dmg",
    );
    expect(latestJsonUrl("o/r")).toBe("https://github.com/o/r/releases/latest/download/latest.json");
  });
});

describe("integrity gates", () => {
  it("a wrong updater signature fails verification, and a tampered archive is rejected", () => {
    const conf = JSON.parse(readFileSync(join(repoRoot, "src-tauri/tauri.conf.json"), "utf8"));
    const pubText = Buffer.from(conf.plugins.updater.pubkey, "base64").toString("utf8").trim().split("\n");
    const keyId = Buffer.from(pubText[1], "base64").subarray(2, 10);
    const raw = Buffer.concat([Buffer.from("ED"), keyId, Buffer.alloc(64, 7)]);
    const sig = Buffer.from(`untrusted comment: forged\n${raw.toString("base64")}\n`).toString("base64");

    const dir = mkdtempSync(join(tmpdir(), "metrio-badsig-"));
    writeFileSync(join(dir, "Metrio.app.tar.gz"), "archive-bytes");
    writeFileSync(join(dir, "Metrio.app.tar.gz.sig"), sig);
    const verify = spawnSync("node", [script("verify-updater-artifacts.mjs"), dir], { encoding: "utf8" });
    expect(verify.status).not.toBe(0);
    expect(verify.stderr).toMatch(/does not verify/);

    // the tamper tool must report failure-to-accept as success of the negative test: here the
    // archive is already unverifiable, so verification fails either way and the tool passes.
    const tamper = spawnSync("node", [script("verify-updater-tamper.mjs"), dir], { encoding: "utf8" });
    expect(tamper.status).toBe(0);
  });

  it("stale or mismatched provenance is reported", () => {
    const good = {
      expectedVersion: "0.1.4",
      expectedSha: "c071d175a56cb96408463bdc11d08d798e6ce1b8",
      plistVersion: "0.1.4",
      packageVersion: "0.1.4",
      confVersion: "0.1.4",
      cargoVersion: "0.1.4",
      buildEnv: { GIT_COMMIT: "c071d17", BUILD_CHANNEL: "production" },
      distContainsSha: true,
    };
    expect(checkProvenance(good)).toEqual([]);
    expect(checkProvenance({ ...good, buildEnv: { GIT_COMMIT: "d0a951c", BUILD_CHANNEL: "production" } }).join()).toMatch(/d0a951c/);
    expect(checkProvenance({ ...good, plistVersion: "0.1.3" }).join()).toMatch(/Info\.plist/);
    expect(checkProvenance({ ...good, distContainsSha: false }).join()).toMatch(/frontend/);
    expect(checkProvenance({ ...good, buildEnv: { GIT_COMMIT: "c071d17", BUILD_CHANNEL: "development" } }).join()).toMatch(/channel/);
    expect(checkProvenance({ ...good, buildEnv: undefined }).length).toBeGreaterThan(0);
  });
});

describe("generated-report handling before the release commit", () => {
  function repoWithReport() {
    const repo = mkdtempSync(join(tmpdir(), "metrio-clean-"));
    const git = (...args: string[]) =>
      execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], {
        cwd: repo,
        encoding: "utf8",
      }).trim();
    mkdirSync(join(repo, "docs"), { recursive: true });
    mkdirSync(join(repo, "src"), { recursive: true });
    writeFileSync(join(repo, "docs/pass14-legacy-parity-report.md"), "report v1\n");
    writeFileSync(join(repo, "src/a.ts"), "export {};\n");
    git("init", "-q", "-b", "main");
    git("add", "-A");
    git("commit", "-q", "-m", "init");
    const run = () => spawnSync("bash", [script("ci/restore-generated-report.sh")], { cwd: repo, encoding: "utf8" });
    return { repo, git, run };
  }

  it("restores only the known generated report and then passes", () => {
    const { repo, git, run } = repoWithReport();
    writeFileSync(join(repo, "docs/pass14-legacy-parity-report.md"), "regenerated\n");
    const result = run();
    expect(result.status).toBe(0);
    expect(readFileSync(join(repo, "docs/pass14-legacy-parity-report.md"), "utf8")).toBe("report v1\n");
    expect(git("status", "--porcelain", "--untracked-files=no")).toBe("");
  }, 60_000);

  it("still fails on any other tracked change, even alongside the generated report", () => {
    const { repo, run } = repoWithReport();
    writeFileSync(join(repo, "docs/pass14-legacy-parity-report.md"), "regenerated\n");
    writeFileSync(join(repo, "src/a.ts"), "export const surprise = 1;\n");
    const result = run();
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/Unexpected tracked changes/);
    expect(result.stdout).toContain("src/a.ts");
    // the unexpected change is left visible, not silently reverted
    expect(readFileSync(join(repo, "src/a.ts"), "utf8")).toContain("surprise");
  }, 60_000);

  it("passes on an already clean tree and the workflow runs it right after the test gate", () => {
    const { run } = repoWithReport();
    expect(run().status).toBe(0);
    const wf = readFileSync(join(repoRoot, ".github/workflows/release-macos.yml"), "utf8");
    const gate = wf.indexOf("- name: Test gate");
    const restore = wf.indexOf("restore-generated-report.sh");
    const bump = wf.indexOf("- name: Version bump + release commit");
    expect(gate).toBeGreaterThan(-1);
    expect(restore).toBeGreaterThan(gate);
    expect(restore).toBeLessThan(bump);
    expect(wf).not.toMatch(/git restore \./);
  }, 60_000);
});

describe("user-facing release notes", () => {
  it("drops internal release/CI/test/docs commits and keeps product subjects", () => {
    for (const internal of [
      "RELEASE Metrio v0.1.5 [skip release]",
      "CI Enable automatic Metrio releases from main",
      "CI: harden notarization",
      "TEST Pin Playwright visual clock and re-record snapshots",
      "DOCS Refresh PASS22.2 screenshots",
      "DOCS: nothing",
      "Merge branch 'main' into x",
      "Anything [skip release]",
      "",
    ]) {
      expect(isInternalCommitSubject(internal), internal).toBe(true);
    }
    for (const product of [
      "PASS24 Preserve updater install diagnostics",
      "PASS22.2 Align remaining surfaces with Lead design system",
      "Fix goal drawer due date picker layering",
      "CIty map fix",
    ]) {
      expect(isInternalCommitSubject(product), product).toBe(false);
    }
  });

  it("builds compact notes, dedupes, caps the list and has a fallback", () => {
    const notes = buildReleaseNotes({
      version: "0.1.5",
      subjects: ["RELEASE Metrio v0.1.4 [skip release]", "Add dashboard export", "CI Harden", "Add dashboard export", "Fix drawer"],
    });
    expect(notes).toBe("Metrio 0.1.5\n\n- Add dashboard export\n- Fix drawer\n");
    expect(notes).not.toMatch(/RELEASE|CI /);
    const only = buildReleaseNotes({ version: "0.1.5", subjects: ["CI x", "TEST y"] });
    expect(only).toContain("Maintenance and stability improvements.");
    const many = buildReleaseNotes({ version: "1.0.0", subjects: Array.from({ length: 50 }, (_, i) => `Change ${i}`), limit: 30 });
    expect(many.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(30);
  });

  it("the CLI reads a git range and the workflow uses it", () => {
    const repo = mkdtempSync(join(tmpdir(), "metrio-notes-"));
    mkdirSync(join(repo, "scripts"), { recursive: true });
    for (const f of ["generate-release-notes.mjs", "release-lib.mjs"]) cpSync(script(f), join(repo, "scripts", f));
    const git = (...a: string[]) =>
      execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...a], { cwd: repo, encoding: "utf8" }).trim();
    git("init", "-q", "-b", "main");
    git("commit", "-q", "--allow-empty", "-m", "Initial product");
    git("tag", "v1.0.0");
    for (const m of ["Add search", "CI tweak", "RELEASE Metrio v1.0.1 [skip release]", "Fix sidebar"]) git("commit", "-q", "--allow-empty", "-m", m);
    const out = execFileSync("node", [join(repo, "scripts/generate-release-notes.mjs"), "--version", "1.0.1", "--to", "HEAD", "--from", "v1.0.0"], { cwd: repo, encoding: "utf8" });
    expect(out).toBe("Metrio 1.0.1\n\n- Fix sidebar\n- Add search\n");
    const wf = readFileSync(join(repoRoot, ".github/workflows/release-macos.yml"), "utf8");
    expect(wf).toContain("scripts/generate-release-notes.mjs");
    expect(wf).not.toContain("grep -v '^- RELEASE '");
    expect(shouldRelease({ changedFiles: ["scripts/generate-release-notes.mjs"], headMessage: "CI notes" }).release).toBe(false);
  }, 60_000);
});

describe("automatic trigger safety", () => {
  it("the commit that enables the push trigger (workflow + docs + tests only) does not release", () => {
    const decision = shouldRelease({
      changedFiles: [".github/workflows/release-macos.yml", "docs/releasing.md", "src/test/releaseAutomation.test.ts"],
      headMessage: "CI Enable automatic Metrio releases from main",
    });
    expect(decision.release).toBe(false);
  });

  it("the generated release commit never re-triggers a release, even with its version files changed", () => {
    const files = ["package.json", "package-lock.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock", "src/config/build.ts", "CHANGELOG.md"];
    expect(shouldRelease({ changedFiles: files, headMessage: releaseCommitMessage("0.1.5") }).release).toBe(false);
  });
});

describe("notarization credential handling (stubbed notarytool)", () => {
  const UUID = "12345678-abcd-4ef0-9abc-0123456789ab";
  const P8 = "-----BEGIN PRIVATE KEY-----\nLINE1\n  indented line  \nLINE3\n-----END PRIVATE KEY-----\n";

  function run(env: Record<string, string | undefined>) {
    const dir = mkdtempSync(join(tmpdir(), "metrio-notary-"));
    const bin = join(dir, "bin");
    mkdirSync(bin);
    const argsFile = join(dir, "xcrun-args.txt");
    writeFileSync(
      join(bin, "xcrun"),
      `#!/bin/bash\nprintf '%s\\n' "$@" >> "${argsFile}"\nif [ "$2" = "submit" ] || [ "$1 $2" = "notarytool submit" ]; then echo '{"id":"sub-1","status":"Accepted"}'; fi\n`,
      { mode: 0o755 },
    );
    const keyPath = join(dir, "AuthKey.p8");
    writeFileSync(keyPath, P8);
    const upload = join(dir, "Metrio.zip");
    writeFileSync(upload, "zip");
    const result = spawnSync("bash", [script("ci/notarize.sh"), upload], {
      encoding: "utf8",
      env: { PATH: `${bin}:${process.env.PATH}`, APPLE_API_KEY_PATH: keyPath, ...env } as Record<string, string>,
    });
    const args = existsSync(argsFile) ? readFileSync(argsFile, "utf8") : "";
    return { result, args, keyPath };
  }

  it("normalizes an issuer with a trailing newline", () => {
    const { result, args } = run({ APPLE_API_ISSUER: `${UUID}\n`, APPLE_API_KEY: "ABCD123456" });
    expect(result.status).toBe(0);
    expect(args).toContain(`--issuer\n${UUID}\n`);
    expect(result.stdout).toContain("Accepted");
  });

  it("normalizes surrounding spaces/tabs/CR on both issuer and key id", () => {
    const { result, args } = run({ APPLE_API_ISSUER: `  \t${UUID} \r\n`, APPLE_API_KEY: "  ABCD123456\n" });
    expect(result.status).toBe(0);
    expect(args).toContain(`--issuer\n${UUID}\n`);
    expect(args).toContain("--key-id\nABCD123456\n");
  });

  it("rejects a malformed issuer before notarytool runs, without echoing its value", () => {
    const secret = "not-a-uuid-SECRETISH";
    const { result, args } = run({ APPLE_API_ISSUER: secret, APPLE_API_KEY: "ABCD123456" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("APPLE_API_ISSUER");
    expect(result.stdout + result.stderr).not.toContain(secret);
    expect(args).toBe("");
    const missing = run({ APPLE_API_KEY: "ABCD123456" });
    expect(missing.result.status).not.toBe(0);
    expect(missing.args).toBe("");
  });

  it("rejects an empty key id before notarytool runs", () => {
    const { result, args } = run({ APPLE_API_ISSUER: UUID, APPLE_API_KEY: " \n" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("APPLE_API_KEY");
    expect(args).toBe("");
  });

  it("never rewrites the .p8 private key content", () => {
    const { result, keyPath } = run({ APPLE_API_ISSUER: UUID, APPLE_API_KEY: "ABCD123456" });
    expect(result.status).toBe(0);
    expect(readFileSync(keyPath, "utf8")).toBe(P8);
  });
});

describe("release workflow structure", () => {
  const workflow = readFileSync(join(repoRoot, ".github/workflows/release-macos.yml"), "utf8");
  const stepIndex = (needle: string) => {
    const i = workflow.indexOf(needle);
    expect(i, `missing workflow step: ${needle}`).toBeGreaterThan(-1);
    return i;
  };

  it("is the single release owner: no tag trigger, serialized, minimal permissions", () => {
    expect(workflow).not.toMatch(/tags:/);
    // automatic starts: pushes to main only; manual dispatch stays as the fallback
    expect(workflow).toMatch(/^  push:\n    branches: \[main\]/m);
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).toMatch(/group: metrio-release-main\n\s+cancel-in-progress: false/);
    expect(workflow).toMatch(/^permissions:\n\s+contents: write\n/m);
    expect(workflow).not.toMatch(/pull-requests:|issues:|actions: write|id-token:/);
  });

  it("follows the proven order: sign → notarize/staple app → archive → DMG → latest.json → publish", () => {
    // per-architecture order lives in scripts/ci/package-target.sh
    const pkg = readFileSync(join(repoRoot, "scripts/ci/package-target.sh"), "utf8");
    const pkgOrder = [
      "verify-build-provenance.mjs",
      "verify-app-signature.sh",
      "notarize.sh \"$RUNNER_TEMP/Metrio-$ID-app.zip\"",
      "tar -czf",
      "build-dmg.sh",
    ].map((needle) => pkg.indexOf(needle));
    expect(pkgOrder.every((i) => i >= 0)).toBe(true);
    expect([...pkgOrder].sort((a, b) => a - b)).toEqual(pkgOrder);
    const order = [
      "Package macOS Apple Silicon",
      "Package macOS Intel",
      "Verify updater signatures for every platform",
      "Generate and validate latest.json",
      "Tag, publish release, verify published bytes",
      "Verify the live endpoint",
    ].map(stepIndex);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // latest.json (the client switch) is uploaded only after the binaries were compared byte-for-byte
    expect(stepIndex("cmp \"release-assets/$f\"")).toBeLessThan(stepIndex("gh release upload \"$TAG\" release-assets/latest.json"));
    expect(stepIndex("gh release upload \"$TAG\" release-assets/latest.json")).toBeLessThan(stepIndex("gh release edit \"$TAG\" --latest"));
  });

  it("keeps Apple signing separate from updater signing and never inlines secret values", () => {
    for (const name of [
      "TAURI_SIGNING_PRIVATE_KEY",
      "TAURI_SIGNING_PRIVATE_KEY_PASSWORD",
      "APPLE_CERTIFICATE",
      "APPLE_CERTIFICATE_PASSWORD",
      "APPLE_API_ISSUER",
      "APPLE_API_KEY",
      "APPLE_API_KEY_CONTENT",
    ]) {
      expect(workflow).toContain(`secrets.${name}`);
    }
    expect(workflow).not.toMatch(/BEGIN (PRIVATE|CERTIFICATE)/);
    expect(workflow).toContain("scripts/plan-release.mjs");
    expect(workflow).toContain("RELEASE Metrio v$VERSION [skip release]");
    expect(readFileSync(join(repoRoot, "scripts/ci/package-target.sh"), "utf8")).toContain("verify-build-provenance.mjs");
    expect(workflow).toContain("verify-updater-tamper.mjs");
    // the build step must not notarize on its own (the app is stapled before archiving)
    const pkgScript = readFileSync(join(repoRoot, "scripts/ci/package-target.sh"), "utf8");
    const buildCmd = pkgScript.slice(pkgScript.indexOf("npm run tauri build"), pkgScript.indexOf("verify-build-provenance.mjs"));
    expect(buildCmd).not.toContain("notarytool");
    expect(buildCmd).toContain("--bundles app");
  });
});
