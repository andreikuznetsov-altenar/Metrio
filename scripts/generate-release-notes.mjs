#!/usr/bin/env node
/**
 * Writes compact, user-facing release notes (internal RELEASE/CI/TEST/DOCS commits are dropped).
 *
 *   node scripts/generate-release-notes.mjs --version 0.1.5 --to <sha> [--from <previous tag>]
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReleaseNotes } from "./release-lib.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const version = value("--version");
const to = value("--to") ?? "HEAD";
const from = value("--from");
if (!version) {
  console.error("Usage: generate-release-notes.mjs --version X.Y.Z --to <sha> [--from <tag>]");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const range = from ? `${from}..${to}` : to;
const subjects = execFileSync("git", ["log", range, "--no-merges", "--pretty=%s"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
process.stdout.write(buildReleaseNotes({ version, subjects }));
