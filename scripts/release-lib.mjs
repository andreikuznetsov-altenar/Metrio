/**
 * Pure helpers for the automated release pipeline. No network, no git, no Apple
 * services: everything here is deterministic and unit-tested.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(value) {
  const match = SEMVER.exec(String(value ?? "").trim().replace(/^v/, ""));
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) throw new Error(`Invalid semver comparison: ${a} vs ${b}`);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

export function bumpPatch(version) {
  const parts = parseSemver(version);
  if (!parts) throw new Error(`Invalid semver: ${version}`);
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function maxVersion(versions) {
  return versions.reduce((best, v) => (best === null || compareSemver(v, best) > 0 ? v : best), null);
}

/** Highest stable (non-draft, non-prerelease, vX.Y.Z) release from `gh release list --json` output. */
export function latestStableVersion(releases) {
  const stable = (releases ?? [])
    .filter((r) => r && !r.isDraft && !r.isPrerelease && parseSemver(r.tagName))
    .map((r) => String(r.tagName).replace(/^v/, ""));
  return maxVersion(stable);
}

/** Highest vX.Y.Z tag, including withdrawn ones: a used version number is never reused. */
export function highestTagVersion(tags) {
  return maxVersion((tags ?? []).filter((t) => parseSemver(t)).map((t) => String(t).replace(/^v/, "")));
}

/**
 * Next release version.
 *  - normal case: patch bump of max(package version, latest stable, highest tag);
 *  - retry case: a version commit that was pushed but never released (package version is above
 *    every released/tagged version and its tag does not exist) is reused, not skipped;
 *  - a deliberate manual bump (e.g. 0.2.0) is honoured the same way.
 */
export function nextReleaseVersion({ packageVersion, latestStable, tags }) {
  if (!parseSemver(packageVersion)) throw new Error(`Invalid package version: ${packageVersion}`);
  const floor = maxVersion(
    [latestStable, highestTagVersion(tags)].filter((v) => v && parseSemver(v)),
  );
  if (floor === null) return packageVersion;
  const tagExists = (tags ?? []).some((t) => String(t).replace(/^v/, "") === packageVersion);
  if (compareSemver(packageVersion, floor) > 0 && !tagExists) {
    return packageVersion;
  }
  return bumpPatch(maxVersion([packageVersion, floor]));
}

/** Files that cannot change the packaged application. Everything else counts as runtime. */
const NON_RUNTIME_PATTERNS = [
  /^docs\//,
  /^[^/]*\.md$/i,
  /^README/i,
  /^LICENSE/i,
  /^\.github\//,
  /^e2e\//,
  /^src\/test\//,
  /\.test\.(ts|tsx|mjs|js)$/,
  /^src-tauri\/tests\//,
  /^scripts\/(release-lib|prepare-release-version|plan-release|verify-build-provenance|verify-updater-tamper|generate-release-notes)\.mjs$/,
  /^scripts\/ci\//,
  /^\.gitignore$/,
];

export function isNonRuntimeFile(file) {
  const normalized = String(file).replace(/\\/g, "/").replace(/^\.\//, "");
  if (/\.md$/i.test(normalized)) return true;
  return NON_RUNTIME_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const SKIP_RELEASE_MARKER = "[skip release]";

/**
 * Decide whether a run should cut a release.
 *  - `force` (manual workflow_dispatch) always releases;
 *  - a HEAD commit carrying the skip marker (the generated release commit) never releases
 *    automatically, which is the recursion guard;
 *  - otherwise release only if some changed file can affect the packaged app.
 */
export function shouldRelease({ changedFiles, headMessage = "", force = false }) {
  if (force) return { release: true, reason: "forced (manual dispatch)" };
  if (String(headMessage).includes(SKIP_RELEASE_MARKER)) {
    return { release: false, reason: "head commit is marked [skip release]" };
  }
  const files = (changedFiles ?? []).map((f) => String(f).trim()).filter(Boolean);
  if (files.length === 0) return { release: false, reason: "no changes since the last release" };
  const runtime = files.filter((f) => !isNonRuntimeFile(f));
  if (runtime.length === 0) return { release: false, reason: "only documentation/tests/automation changed" };
  return { release: true, reason: `runtime changes: ${runtime.slice(0, 5).join(", ")}${runtime.length > 5 ? ", …" : ""}` };
}

/** Internal maintenance commits that never belong in user-facing release notes. */
const INTERNAL_SUBJECT = /^(RELEASE|CI|TEST|TESTS|DOCS?|CHORE|MAINT|BUILD)(\b|:)/;

export function isInternalCommitSubject(subject) {
  const text = String(subject ?? "").trim();
  if (!text) return true;
  if (INTERNAL_SUBJECT.test(text)) return true;
  if (text.includes(SKIP_RELEASE_MARKER)) return true;
  if (/^Merge (branch|pull request|remote-tracking)/.test(text)) return true;
  return false;
}

/** Compact, user-facing release notes from commit subjects (newest first). */
export function buildReleaseNotes({ version, subjects, limit = 30 }) {
  const seen = new Set();
  const items = [];
  for (const subject of subjects ?? []) {
    const text = String(subject).trim();
    if (isInternalCommitSubject(text) || seen.has(text)) continue;
    seen.add(text);
    items.push(`- ${text}`);
    if (items.length >= limit) break;
  }
  const body = items.length > 0 ? items.join("\n") : "- Maintenance and stability improvements.";
  return `Metrio ${version}\n\n${body}\n`;
}

export function releaseCommitMessage(version) {
  return `RELEASE Metrio v${version} ${SKIP_RELEASE_MARKER}`;
}

export function releaseAssetUrl(repo, tag, assetName) {
  return `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(assetName)}`;
}

export function latestJsonUrl(repo) {
  return `https://github.com/${repo}/releases/latest/download/latest.json`;
}

export function buildLatestManifest({ version, repo, archiveName, signature, platform = "darwin-aarch64", notes, pubDate }) {
  const sig = String(signature ?? "").trim();
  if (!sig || /^https?:\/\//i.test(sig)) throw new Error("signature must be the .sig file content, not a URL");
  if (!parseSemver(version)) throw new Error(`Invalid version: ${version}`);
  return {
    version,
    notes: notes?.trim() || `Metrio ${version}`,
    pub_date: pubDate ?? new Date().toISOString(),
    platforms: { [platform]: { signature: sig, url: releaseAssetUrl(repo, `v${version}`, archiveName) } },
  };
}

/** Errors (empty when the packaged build provenance matches the release commit). */
export function checkProvenance({ expectedVersion, expectedSha, plistVersion, packageVersion, confVersion, cargoVersion, buildEnv, distContainsSha }) {
  const errors = [];
  for (const [label, value] of [
    ["Info.plist", plistVersion],
    ["package.json", packageVersion],
    ["tauri.conf.json", confVersion],
    ["Cargo.toml", cargoVersion],
  ]) {
    if (value !== expectedVersion) errors.push(`${label} version ${value} != ${expectedVersion}`);
  }
  const short = String(expectedSha).slice(0, 7);
  if (!buildEnv || buildEnv.GIT_COMMIT !== short) {
    errors.push(`native build commit ${buildEnv?.GIT_COMMIT ?? "(missing)"} != ${short}`);
  }
  if (!buildEnv || buildEnv.BUILD_CHANNEL !== "production") {
    errors.push(`build channel ${buildEnv?.BUILD_CHANNEL ?? "(missing)"} != production`);
  }
  if (!distContainsSha) errors.push(`frontend bundle does not embed commit ${expectedSha}`);
  return errors;
}

/** The authoritative version sources, updated together. Returns the list of files changed. */
export function applyVersion(root, version) {
  if (!parseSemver(version)) throw new Error(`Invalid version: ${version}`);
  const changed = [];
  const rewrite = (relative, transform) => {
    const path = join(root, relative);
    if (!existsSync(path)) throw new Error(`Missing version source: ${relative}`);
    const before = readFileSync(path, "utf8");
    const after = transform(before);
    if (after !== before) {
      writeFileSync(path, after);
      changed.push(relative);
    }
  };
  const json = (text, mutate) => {
    const data = JSON.parse(text);
    mutate(data);
    return `${JSON.stringify(data, null, 2)}\n`;
  };

  rewrite("package.json", (t) => json(t, (d) => { d.version = version; }));
  rewrite("package-lock.json", (t) =>
    json(t, (d) => {
      d.version = version;
      if (d.packages?.[""]) d.packages[""].version = version;
    }),
  );
  rewrite("src-tauri/tauri.conf.json", (t) => json(t, (d) => { d.version = version; }));
  rewrite("src-tauri/Cargo.toml", (t) => {
    if (!/^version = "[^"]*"/m.test(t)) throw new Error("Cargo.toml has no package version");
    return t.replace(/^version = "[^"]*"/m, `version = "${version}"`);
  });
  rewrite("src-tauri/Cargo.lock", (t) => {
    const pattern = /(\[\[package\]\]\nname = "metrio"\nversion = ")[^"]*(")/;
    if (!pattern.test(t)) throw new Error("Cargo.lock has no metrio package entry");
    return t.replace(pattern, `$1${version}$2`);
  });
  rewrite("src/config/build.ts", (t) => {
    if (!/\|\| '\d+\.\d+\.\d+'/.test(t)) throw new Error("build.ts has no version fallback");
    return t.replace(/\|\| '\d+\.\d+\.\d+'/, `|| '${version}'`);
  });
  rewrite("CHANGELOG.md", (t) => {
    if (new RegExp(`^## ${version.replace(/\./g, "\\.")}\\b`, "m").test(t)) return t;
    return t.replace(/^## Unreleased\n/m, `## Unreleased\n\n## ${version} — automated release\n\n- Automated release build.\n`);
  });
  return changed;
}

/** Read the version from every source for consistency checks. */
export function readVersions(root) {
  const read = (relative) => readFileSync(join(root, relative), "utf8");
  const lock = read("src-tauri/Cargo.lock").match(/\[\[package\]\]\nname = "metrio"\nversion = "([^"]*)"/);
  const lockJson = JSON.parse(read("package-lock.json"));
  return {
    "package.json": JSON.parse(read("package.json")).version,
    "package-lock.json": lockJson.version,
    "package-lock.json packages[\"\"]": lockJson.packages?.[""]?.version,
    "tauri.conf.json": JSON.parse(read("src-tauri/tauri.conf.json")).version,
    "Cargo.toml": read("src-tauri/Cargo.toml").match(/^version = "([^"]*)"/m)?.[1],
    "Cargo.lock": lock?.[1],
    "build.ts": read("src/config/build.ts").match(/\|\| '(\d+\.\d+\.\d+)'/)?.[1],
  };
}
