#!/usr/bin/env node
/**
 * Writes Tauri-compatible latest.json (darwin-aarch64) next to release artifacts.
 * Set METRIO_UPDATE_BASE_URL to the HTTPS prefix where tar.gz will be hosted.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node generate-update-manifest.mjs <release-artifacts-dir>");
  process.exit(1);
}

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const version = pkg.version;
const notes =
  process.env.METRIO_RELEASE_NOTES?.trim() ||
  `Metrio ${version} — see CHANGELOG.md`;

const tar = readdirSync(outDir).find((f) => f.endsWith(".tar.gz"));
const sig = readdirSync(outDir).find((f) => f.endsWith(".tar.gz.sig"));
if (!tar || !sig) {
  console.warn("No updater tar.gz/.sig in output — skipping latest.json");
  process.exit(0);
}

const baseUrl = process.env.METRIO_UPDATE_BASE_URL;
if (!baseUrl) {
  console.warn("METRIO_UPDATE_BASE_URL not set — writing relative manifest only");
}

const archiveUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${tar}` : tar;
const signature = readFileSync(join(outDir, sig), "utf8").trim();

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "darwin-aarch64": {
      signature,
      url: archiveUrl,
    },
  },
};

writeFileSync(join(outDir, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${join(outDir, "latest.json")}`);
