#!/usr/bin/env node
/**
 * Writes the Tauri v2 static updater manifest (latest.json) from real release artifacts.
 *
 *   node scripts/generate-update-manifest.mjs <dir-with-updater-artifacts> [--out <dir>]
 *
 * The `signature` field is the CONTENT of the `.sig` file next to the updater archive
 * (never a URL). The archive URL points at the GitHub Release asset for the same tag.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { arch } from "node:os";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const outDir = outFlag >= 0 ? args[outFlag + 1] : undefined;
const artifactDir = args.find((a, i) => !a.startsWith("--") && (outFlag < 0 || i !== outFlag + 1));
if (!artifactDir) {
  console.error("Usage: node generate-update-manifest.mjs <artifact-dir> [--out <dir>]");
  process.exit(1);
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const version = pkg.version;
const repo = process.env.METRIO_RELEASE_REPO || "andreikuznetsov-altenar/Metrio";
const tag = process.env.METRIO_RELEASE_TAG || `v${version}`;
const baseUrl = (
  process.env.METRIO_UPDATE_BASE_URL || `https://github.com/${repo}/releases/download/${tag}`
).replace(/\/$/, "");
const notes = process.env.METRIO_RELEASE_NOTES?.trim() || `Metrio ${version}`;

const files = readdirSync(artifactDir);
const archive = files.find((f) => f.endsWith(".app.tar.gz")) ?? files.find((f) => f.endsWith(".tar.gz"));
const sigFile = archive ? files.find((f) => f === `${archive}.sig`) : undefined;
if (!archive || !sigFile) {
  console.error(`No updater archive + .sig found in ${artifactDir}`);
  process.exit(1);
}

const platform = process.env.METRIO_UPDATER_PLATFORM || `darwin-${arch() === "arm64" ? "aarch64" : "x86_64"}`;
const signature = readFileSync(join(artifactDir, sigFile), "utf8").trim();
if (/^https?:\/\//i.test(signature)) {
  console.error("Signature must be the .sig file CONTENT, not a URL");
  process.exit(1);
}

const entry = { signature, url: `${baseUrl}/${encodeURIComponent(archive)}` };
const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: { [platform]: entry },
};

const target = join(outDir ?? artifactDir, "latest.json");
writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${target} (${platform}, v${version})`);
