#!/usr/bin/env node
/**
 * Sets every authoritative Metrio version source to X.Y.Z (idempotent).
 *
 *   node scripts/prepare-release-version.mjs 0.1.4
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyVersion, readVersions } from "./release-lib.mjs";

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/prepare-release-version.mjs <X.Y.Z>");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const changed = applyVersion(root, version);
const versions = readVersions(root);
const wrong = Object.entries(versions).filter(([, v]) => v !== version);
if (wrong.length > 0) {
  console.error(`Version sources disagree after update: ${JSON.stringify(wrong)}`);
  process.exit(1);
}
console.log(changed.length ? `Updated ${changed.join(", ")} to ${version}` : `Already at ${version}`);
