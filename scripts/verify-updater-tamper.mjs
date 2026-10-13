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
const archive = readdirSync(dir).find((f) => f.endsWith(".app.tar.gz"));
if (!archive) throw new Error(`No updater archive in ${dir}`);
const copy = mkdtempSync(join(tmpdir(), "metrio-tamper-"));
copyFileSync(join(dir, archive), join(copy, archive));
copyFileSync(join(dir, `${archive}.sig`), join(copy, `${archive}.sig`));
appendFileSync(join(copy, archive), "x");

const verifier = join(dirname(fileURLToPath(import.meta.url)), "verify-updater-artifacts.mjs");
const result = spawnSync("node", [verifier, copy], { encoding: "utf8" });
if (result.status === 0) {
  console.error("FAIL: a tampered archive was accepted");
  process.exit(1);
}
console.log("OK: tampered archive is rejected");
