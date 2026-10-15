#!/usr/bin/env node
/**
 * Fails unless the packaged build provably belongs to the release commit.
 *
 *   node scripts/verify-build-provenance.mjs --app <Metrio.app> --version X.Y.Z --sha <full sha>
 *
 * Inputs: Info.plist version, the version in every source, the commit Cargo baked into the
 * native build (build-script output) and the commit embedded in the frontend bundle.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkProvenance } from "./release-lib.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const app = value("--app");
const expectedVersion = value("--version");
const expectedSha = value("--sha");
if (!app || !expectedVersion || !expectedSha) {
  console.error("Usage: verify-build-provenance.mjs --app <Metrio.app> --version X.Y.Z --sha <full sha>");
  process.exit(1);
}
const targetTriple = value("--target");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const plistVersion = execFileSync(
  "plutil",
  ["-extract", "CFBundleShortVersionString", "raw", join(app, "Contents/Info.plist")],
  { encoding: "utf8" },
).trim();

function newestBuildOutput() {
  const buildDir = join(root, "src-tauri/target", ...(targetTriple ? [targetTriple] : []), "release/build");
  if (!existsSync(buildDir)) return null;
  const candidates = readdirSync(buildDir)
    .filter((d) => d.startsWith("metrio-"))
    .map((d) => join(buildDir, d, "output"))
    .filter((p) => existsSync(p) && /GIT_COMMIT=/.test(readFileSync(p, "utf8")))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0] ?? null;
}
const outputPath = newestBuildOutput();
const buildEnv = {};
if (outputPath) {
  for (const line of readFileSync(outputPath, "utf8").split("\n")) {
    const match = /^cargo:rustc-env=(GIT_COMMIT|BUILD_CHANNEL)=(.*)$/.exec(line.trim());
    if (match) buildEnv[match[1]] = match[2];
  }
}

let distContainsSha = false;
const assets = join(root, "dist/assets");
if (existsSync(assets)) {
  distContainsSha = readdirSync(assets)
    .filter((f) => f.endsWith(".js"))
    .some((f) => readFileSync(join(assets, f), "utf8").includes(expectedSha));
}

const errors = checkProvenance({
  expectedVersion,
  expectedSha,
  plistVersion,
  packageVersion: JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
  confVersion: JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8")).version,
  cargoVersion: readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8").match(/^version = "([^"]*)"/m)?.[1],
  buildEnv,
  distContainsSha,
});
if (errors.length > 0) {
  console.error(`PROVENANCE FAILED:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`OK: build provenance — Version ${expectedVersion}, Production · ${expectedSha.slice(0, 7)}`);
