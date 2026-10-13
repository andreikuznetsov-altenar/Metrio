#!/usr/bin/env node
/**
 * Independently verifies that an updater archive's `.sig` is a valid minisign signature
 * made by the key configured in tauri.conf.json (no private material involved), and that
 * latest.json (if present) references that signature content.
 *
 *   node scripts/verify-updater-artifacts.mjs <artifact-dir>
 */
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node verify-updater-artifacts.mjs <artifact-dir>");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const conf = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));

function parseMinisignPublicKey(base64Text) {
  const text = Buffer.from(base64Text, "base64").toString("utf8").trim().split("\n");
  const raw = Buffer.from(text[1], "base64");
  return { keyId: raw.subarray(2, 10), key: raw.subarray(10, 42), comment: text[0] };
}

function parseMinisignSignature(base64Text) {
  const text = Buffer.from(base64Text, "base64").toString("utf8").trim().split("\n");
  const raw = Buffer.from(text[1], "base64");
  return { algorithm: raw.subarray(0, 2).toString("ascii"), keyId: raw.subarray(2, 10), signature: raw.subarray(10, 74) };
}

const files = readdirSync(dir);
const archive = files.find((f) => f.endsWith(".app.tar.gz")) ?? files.find((f) => f.endsWith(".tar.gz"));
if (!archive) throw new Error(`No updater archive in ${dir}`);
const sigText = readFileSync(join(dir, `${archive}.sig`), "utf8").trim();

const pub = parseMinisignPublicKey(conf.plugins.updater.pubkey);
const sig = parseMinisignSignature(sigText);
if (!pub.keyId.equals(sig.keyId)) {
  console.error("FAIL: signature key id does not match the configured public key");
  process.exit(1);
}

const data = readFileSync(join(dir, archive));
const message = sig.algorithm === "ED" ? createHash("blake2b512").update(data).digest() : data;
const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), pub.key]);
const ok = verify(null, message, createPublicKey({ key: spki, format: "der", type: "spki" }), sig.signature);
if (!ok) {
  console.error("FAIL: signature does not verify for the updater archive");
  process.exit(1);
}
console.log(`OK: ${archive}.sig verifies with the configured public key (${pub.keyId.toString("hex")})`);

const manifestPath = join(dir, "latest.json");
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const [platform, entry] of Object.entries(manifest.platforms)) {
    if (entry.signature !== sigText) throw new Error(`latest.json ${platform} signature is not the .sig content`);
    if (/^https?:/i.test(entry.signature)) throw new Error("latest.json signature must not be a URL");
    if (!entry.url.endsWith(encodeURIComponent(archive))) throw new Error(`latest.json ${platform} url does not point at ${archive}`);
  }
  if (manifest.version !== pkg.version) throw new Error("latest.json version does not match package.json");
  console.log(`OK: latest.json (${Object.keys(manifest.platforms).join(", ")}) matches the artifacts`);
}
