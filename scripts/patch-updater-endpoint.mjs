#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const endpoint = process.argv[2];
if (!endpoint || !endpoint.startsWith("https://")) {
  console.error("Usage: node patch-updater-endpoint.mjs https://host/path/latest.json");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "src-tauri/tauri.conf.json");
const conf = JSON.parse(readFileSync(path, "utf8"));
conf.plugins = conf.plugins ?? {};
conf.plugins.updater = conf.plugins.updater ?? {};
conf.plugins.updater.endpoints = [endpoint];
writeFileSync(path, `${JSON.stringify(conf, null, 2)}\n`);
console.log(`Patched updater endpoint to ${endpoint}`);
