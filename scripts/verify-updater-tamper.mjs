#!/usr/bin/env node
/**
 * Negative test: a one-byte-modified copy of the updater archive MUST fail verification.
 *
 *   node scripts/verify-updater-tamper.mjs <artifact-dir>
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, copyFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node verify-updater-tamper.mjs <artifact-dir>");
  process.exit(1);
}
const archives = readdirSync(dir).filter((f) => f.endsWith(".app.tar.gz") || /-setup\.exe$/.test(f));
if (archives.length === 0) throw new Error(`No updater archive in ${dir}`);
const verifier = join(dirname(fileURLToPath(import.meta.url)), "verify-updater-artifacts.mjs");
for (const archive of archives) {
  // Tamper ONE archive; the other architecture's untouched pair must not mask the failure.
  const copy = mkdtempSync(join(tmpdir(), "metrio-tamper-"));
  for (const f of readdirSync(dir)) {
    if (f === "latest.json") continue;
    if (f.endsWith(".tar.gz") || f.endsWith(".tar.gz.sig") || /-setup\.exe(\.sig)?$/.test(f)) copyFileSync(join(dir, f), join(copy, f));
  }
  appendFileSync(join(copy, archive), "x");
  const result = spawnSync("node", [verifier, copy], { encoding: "utf8" });
  if (result.status === 0) {
    console.error(`FAIL: a tampered ${archive} was accepted`);
    process.exit(1);
  }
  console.log(`OK: tampered ${archive} is rejected`);
}
