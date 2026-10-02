#!/usr/bin/env node
/**
 * Single source of truth: package.json version → Cargo.toml + tauri.conf.json + Vite env.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`Invalid semver in package.json: ${version}`);
  process.exit(1);
}

const cargoPath = join(root, "src-tauri/Cargo.toml");
let cargo = readFileSync(cargoPath, "utf8");
cargo = cargo.replace(/^version = ".*"/m, `version = "${version}"`);
writeFileSync(cargoPath, cargo);

const tauriPath = join(root, "src-tauri/tauri.conf.json");
const tauri = JSON.parse(readFileSync(tauriPath, "utf8"));
tauri.version = version;
writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`);

console.log(`Synced app version ${version} to Cargo.toml and tauri.conf.json`);
