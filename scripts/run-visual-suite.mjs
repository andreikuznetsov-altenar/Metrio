#!/usr/bin/env node
/**
 * Bounded runner for the Playwright visual suite.
 *  - one run only (refuses to start if another Playwright/vite visual process is alive)
 *  - hard wall-clock watchdog (default 25 min, override with VISUAL_SUITE_LIMIT_MIN)
 *  - exits with Playwright's own exit code; on timeout kills the process group, prints the log tail, exits 124
 * Usage: node scripts/run-visual-suite.mjs [playwright args...]
 */
import { spawn, execSync } from "node:child_process";
import { createWriteStream, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const limitMs = Number(process.env.VISUAL_SUITE_LIMIT_MIN ?? 25) * 60_000;
const workers = process.env.VISUAL_SUITE_WORKERS ?? "3";
const logPath = join(process.env.TMPDIR || tmpdir(), "visual-suite.log");

try {
  const alive = execSync("pgrep -fl 'playwright test|vite --port' || true", { encoding: "utf8" }).trim();
  if (alive) {
    console.error("Another Playwright/vite process is already running:\n" + alive);
    process.exit(2);
  }
} catch {
  /* pgrep unavailable: continue */
}

const log = createWriteStream(logPath);
const args = ["playwright", "test", "e2e/visual", `--workers=${workers}`, ...process.argv.slice(2)];
const started = Date.now();
const child = spawn("npx", args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", (d) => log.write(d));
child.stderr.on("data", (d) => log.write(d));

const watchdog = setTimeout(() => {
  console.error(`WATCHDOG: visual suite exceeded ${limitMs / 60000} min, killing process group`);
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
  setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch { /* gone */ } }, 5000);
  setTimeout(() => {
    try { console.error(readFileSync(logPath, "utf8").split("\n").slice(-60).join("\n")); } catch { /* no log */ }
    process.exit(124);
  }, 6000);
}, limitMs);

child.on("exit", (code, signal) => {
  clearTimeout(watchdog);
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`visual suite finished in ${mins} min, exit=${code ?? signal}, log=${logPath}`);
  log.end(() => process.exit(code ?? 1));
});
