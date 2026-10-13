#!/usr/bin/env node
/**
 * Release planner. Decides whether this run should release and which version it gets.
 *
 *   node scripts/plan-release.mjs --releases <gh-release-list.json> [--force]
 *
 * `gh release list --json tagName,isDraft,isPrerelease` output goes in the JSON file so the
 * planner itself never talks to the network. Writes GitHub Actions outputs when available.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { latestStableVersion, nextReleaseVersion, shouldRelease } from "./release-lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...gitArgs) => execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();

const releasesFile = value("--releases");
if (!releasesFile) {
  console.error("Usage: node scripts/plan-release.mjs --releases <file> [--force]");
  process.exit(1);
}
const releases = JSON.parse(readFileSync(releasesFile, "utf8"));
const tags = git("tag", "-l").split("\n").filter(Boolean);
const packageVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const latestStable = latestStableVersion(releases);

let changedFiles;
if (latestStable && tags.includes(`v${latestStable}`)) {
  changedFiles = git("diff", "--name-only", `v${latestStable}..HEAD`).split("\n").filter(Boolean);
} else {
  changedFiles = git("ls-files").split("\n").filter(Boolean);
}
const headMessage = git("log", "-1", "--format=%B");
const decision = shouldRelease({ changedFiles, headMessage, force: flag("--force") });
const version = nextReleaseVersion({ packageVersion, latestStable, tags });
const tag = `v${version}`;

if (decision.release) {
  if (tags.includes(tag)) throw new Error(`Tag ${tag} already exists; refusing to release`);
  if (releases.some((r) => r.tagName === tag)) throw new Error(`Release ${tag} already exists; refusing to release`);
}

const plan = {
  should_release: decision.release,
  reason: decision.reason,
  version,
  tag,
  previous_tag: latestStable ? `v${latestStable}` : "",
  package_version: packageVersion,
  latest_stable: latestStable ?? "",
};
console.log(JSON.stringify(plan, null, 2));
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(plan).map(([k, v]) => `${k}=${v}`).join("\n") + "\n",
  );
}
