#!/usr/bin/env node
/**
 * Windows runtime QA for the installed Metrio NSIS build (runs on a GitHub windows runner).
 *
 *   node scripts/windows-qa.mjs smoke --installer <setup.exe> --expect-version X.Y.Z [--expect-sha <sha7>]
 *   node scripts/windows-qa.mjs ota   --installer <setup.exe> --from-version A --to-version B
 *
 * Drives the REAL installed app through WebView2's remote-debugging port (CDP). The app runs in
 * the documentation-fixture mode (no credentials / production data). Results go to qa-out/report.json
 * and qa-out/*.png. Every step is recorded; the script exits non-zero if any step failed.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const installer = opt("installer");
const OUT = "qa-out";
mkdirSync(OUT, { recursive: true });
const report = { mode, steps: [] };
const PORT = 9222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ps(script) {
  const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
  return (r.stdout || "").trim() + (r.stderr ? `\n${r.stderr.trim()}` : "");
}

async function step(name, fn) {
  const entry = { name, ok: false };
  try {
    entry.detail = (await fn()) ?? "";
    entry.ok = true;
  } catch (error) {
    entry.detail = String(error?.stack || error).slice(0, 600);
  }
  console.log(`${entry.ok ? "PASS" : "FAIL"} ${name}${entry.detail ? ` — ${String(entry.detail).slice(0, 200)}` : ""}`);
  report.steps.push(entry);
  return entry.ok;
}

function findInstalledExe() {
  const roots = [process.env.LOCALAPPDATA, process.env.ProgramFiles].filter(Boolean).map((p) => join(p, "Metrio"));
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const exe = readdirSync(root).find((f) => /\.exe$/i.test(f) && !/unins|uninstall/i.test(f));
    if (exe) return join(root, exe);
  }
  return null;
}

function exeVersion(exe) {
  return ps(`(Get-Item '${exe}').VersionInfo.ProductVersion`).split("\n")[0].trim();
}

function launch(exe, env = {}) {
  const child = spawn(exe, [], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      METRIO_DOC_FIXTURES: "1",
      METRIO_DOC_ROLE: "lead",
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`,
      ...env,
    },
  });
  child.unref();
  return child;
}

async function connect(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
      const page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith("devtools"));
      if (page) {
        await page.waitForLoadState("domcontentloaded");
        return { browser, page };
      }
    } catch (error) {
      last = error;
    }
    await sleep(2000);
  }
  throw new Error(`CDP connect timed out: ${last}`);
}

function screenshotDesktop(file) {
  ps(`Add-Type -AssemblyName System.Windows.Forms,System.Drawing;
$b=[System.Windows.Forms.SystemInformation]::VirtualScreen;
$bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height;
$g=[System.Drawing.Graphics]::FromImage($bmp);$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size);
$bmp.Save('${join(process.cwd(), OUT, file)}');`);
}

function windowInfo() {
  return ps(`Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class W { [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h,int i);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
 [StructLayout(LayoutKind.Sequential)] public struct R {public int L,T,Rt,B;} }
"@;
$p=Get-Process | Where-Object { $_.ProcessName -like 'metrio*' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
if(-not $p){'no-window'; exit}
$s=[W]::GetWindowLong($p.MainWindowHandle,-16); $r=New-Object W+R; [void][W]::GetWindowRect($p.MainWindowHandle,[ref]$r);
"title='$($p.MainWindowTitle)' style=0x{0:x} caption=$(($s -band 0xC00000) -eq 0xC00000) sysmenu=$(($s -band 0x80000) -ne 0) sizebox=$(($s -band 0x40000) -ne 0) rect=$($r.L),$($r.T),$($r.Rt),$($r.B)" -f $s`);
}

function killApp() {
  ps(`Get-Process | Where-Object { $_.ProcessName -like 'metrio*' } | Stop-Process -Force -ErrorAction SilentlyContinue`);
}

function logTail() {
  const log = join(process.env.APPDATA || "", "com.altenar.metrio", "logs", "app.log");
  return existsSync(log) ? readFileSync(log, "utf8") : "";
}

async function openAbout(page) {
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Company & App" }).click();
  await page.getByText("About", { exact: true }).first().waitFor({ timeout: 15_000 });
}

async function readAbout(page) {
  const text = await page.locator("body").innerText();
  const version = /Version\s+(\d+\.\d+\.\d+)/.exec(text)?.[1];
  const build = /Production\s*·\s*([0-9a-f]{7})/.exec(text)?.[1] ?? /Build\s*\n?\s*([^\n]+)/.exec(text)?.[1];
  return { version, build, upToDate: /You.re up to date/.test(text) };
}

async function install() {
  const r = spawnSync(installer, ["/S"], { encoding: "utf8" });
  if (r.status !== 0 && r.status !== null) throw new Error(`installer exit ${r.status}`);
  for (let i = 0; i < 60 && !findInstalledExe(); i++) await sleep(1000);
  const exe = findInstalledExe();
  if (!exe) throw new Error("installed executable not found");
  return exe;
}

if (mode === "smoke") {
  const expectVersion = opt("expect-version");
  const expectSha = opt("expect-sha");
  let exe;
  await step("silent install of the NSIS installer", async () => {
    exe = await install();
    return `${exe} (product version ${exeVersion(exe)})`;
  });
  await step("installer Authenticode status (informational)", () =>
    ps(`(Get-AuthenticodeSignature '${installer}').Status`));
  await step("installed exe Authenticode status (informational)", () =>
    ps(`(Get-AuthenticodeSignature '${exe}').Status`));
  launch(exe);
  let conn;
  if (await step("app starts and the main window renders", async () => {
    conn = await connect();
    await conn.page.getByRole("button", { name: "Dashboard" }).first().waitFor({ timeout: 60_000 });
    return conn.page.url();
  })) {
    const { page } = conn;
    await step("window chrome (Win32 caption / system menu / size box)", async () => {
      await sleep(1500);
      screenshotDesktop("window-chrome.png");
      return windowInfo();
    });
    await page.screenshot({ path: join(OUT, "dashboard.png") }).catch(() => {});
    await step("Dashboard shows content", async () => {
      await page.getByText("Recommended actions").first().waitFor({ timeout: 30_000 });
    });
    await step("Performance opens", async () => {
      await page.getByRole("button", { name: "Performance" }).first().click();
      await page.getByRole("button", { name: "Delivery Risk" }).first().waitFor({ timeout: 30_000 });
      await page.screenshot({ path: join(OUT, "performance.png") }).catch(() => {});
    });
    await step("scrolling moves the page (mouse wheel through CDP)", async () => {
      const before = await page.evaluate(() => Math.max(window.scrollY, ...[...document.querySelectorAll("*")].map((e) => e.scrollTop)));
      await page.mouse.move(600, 500);
      await page.mouse.wheel(0, 700);
      await sleep(1500);
      const after = await page.evaluate(() => Math.max(window.scrollY, ...[...document.querySelectorAll("*")].map((e) => e.scrollTop)));
      if (!(after > before)) throw new Error(`scroll did not move (${before} -> ${after})`);
      return `${before} -> ${after}`;
    });
    await step("task drawer opens (Delivery Risk → View journey) and closes", async () => {
      await page.getByRole("button", { name: "Delivery Risk" }).first().click();
      await page.getByRole("button", { name: "View journey" }).first().click({ timeout: 30_000 });
      await page.getByText("Task path", { exact: false }).first().waitFor({ timeout: 20_000 });
      await page.screenshot({ path: join(OUT, "task-drawer.png") }).catch(() => {});
      await page.keyboard.press("Escape");
      await sleep(800);
    });
    await step("person drawer opens (People → person) and closes", async () => {
      await page.getByRole("button", { name: "People" }).first().click();
      const row = page.getByRole("row").nth(1);
      await row.click({ timeout: 20_000 });
      await page.getByRole("button", { name: "Close drawer" }).first().waitFor({ timeout: 20_000 });
      await page.screenshot({ path: join(OUT, "person-drawer.png") }).catch(() => {});
      await page.getByRole("button", { name: "Close drawer" }).first().click();
    });
    await step("Settings opens and About shows the expected version/build", async () => {
      await openAbout(page);
      const about = await readAbout(page);
      await page.screenshot({ path: join(OUT, "settings-about.png") }).catch(() => {});
      if (expectVersion && about.version !== expectVersion) throw new Error(`version ${about.version} != ${expectVersion}`);
      if (expectSha && about.build !== expectSha) throw new Error(`build ${about.build} != ${expectSha}`);
      return JSON.stringify(about);
    });
    await step("Check for updates runs and reports a calm result", async () => {
      await page.getByRole("button", { name: "Check for updates" }).click();
      await sleep(8000);
      const about = await readAbout(page);
      await page.screenshot({ path: join(OUT, "updater.png") }).catch(() => {});
      return JSON.stringify(about);
    });
    await step("external link opens the system browser", async () => {
      const before = ps(`(Get-Process msedge -ErrorAction SilentlyContinue | Measure-Object).Count`);
      await page.getByRole("button", { name: "Performance" }).first().click();
      await page.getByRole("button", { name: "Delivery Risk" }).first().click();
      await page.getByRole("button", { name: "Open Jira" }).first().click({ timeout: 20_000 });
      await sleep(6000);
      const after = ps(`(Get-Process msedge -ErrorAction SilentlyContinue | Measure-Object).Count`);
      const cmd = ps(`Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'atlassian' } | Select-Object -First 1 -ExpandProperty CommandLine`);
      if (!/atlassian/.test(cmd)) throw new Error(`no browser process with the Jira URL (msedge before=${before} after=${after})`);
      return cmd.slice(0, 160);
    });
    await step("tray icon installed (app log)", async () => {
      const log = logTail();
      if (!/tray installed/.test(log)) throw new Error("log has no 'tray installed' line");
      return "log: NATIVE tray installed";
    });
    await step("closing the window keeps the app running in the tray", async () => {
      ps(`$p=Get-Process | Where-Object { $_.ProcessName -like 'metrio*' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1; [void]$p.CloseMainWindow()`);
      await sleep(3000);
      const alive = ps(`(Get-Process | Where-Object { $_.ProcessName -like 'metrio*' } | Measure-Object).Count`);
      if (Number(alive.split("\n")[0]) < 1) throw new Error("process exited after closing the window");
      return `processes alive: ${alive.split("\n")[0]}`;
    });
    await conn.browser.close().catch(() => {});
  }
  killApp();
}

if (mode === "ota") {
  const from = opt("from-version");
  const to = opt("to-version");
  let exe;
  await step(`install the controlled previous build (${from})`, async () => {
    exe = await install();
    return `${exe} product version ${exeVersion(exe)}`;
  });
  launch(exe);
  let conn;
  await step("previous build starts", async () => {
    conn = await connect();
    await conn.page.getByRole("button", { name: "Dashboard" }).first().waitFor({ timeout: 60_000 });
  });
  await step(`About shows ${from} before the update`, async () => {
    await openAbout(conn.page);
    const about = await readAbout(conn.page);
    if (about.version !== from) throw new Error(`version ${about.version}`);
    return JSON.stringify(about);
  });
  await step("Check for updates offers the new release", async () => {
    await conn.page.getByRole("button", { name: "Check for updates" }).click();
    await conn.page.getByRole("button", { name: "Update and restart" }).waitFor({ timeout: 60_000 });
    await conn.page.screenshot({ path: join(OUT, "ota-offer.png") }).catch(() => {});
    return (await conn.page.locator("body").innerText()).match(/Metrio [0-9.]+ is ready to install/)?.[0];
  });
  await step("Update and restart installs the new version", async () => {
    await conn.page.getByRole("button", { name: "Update and restart" }).click();
    const deadline = Date.now() + 240_000;
    let v = "";
    while (Date.now() < deadline) {
      await sleep(4000);
      v = exeVersion(exe);
      if (v.startsWith(to)) break;
    }
    if (!v.startsWith(to)) throw new Error(`installed exe still ${v}`);
    return `installed exe product version ${v}`;
  });
  await conn.browser.close().catch(() => {});
  await sleep(8000);
  const running = ps(`(Get-Process | Where-Object { $_.ProcessName -like 'metrio*' } | Measure-Object).Count`).split("\n")[0];
  report.relaunchedByUpdater = Number(running) > 0;
  console.log(`processes after update: ${running}`);
  if (!(Number(running) > 0)) launch(exe);
  else {
    // The updater-relaunched instance was not started by us: restart it with the QA environment.
    killApp();
    await sleep(3000);
    launch(exe);
  }
  await step("updated build starts and About shows the new version", async () => {
    conn = await connect();
    await openAbout(conn.page);
    const about = await readAbout(conn.page);
    if (about.version !== to) throw new Error(`version ${about.version}`);
    await conn.page.screenshot({ path: join(OUT, "ota-after.png") }).catch(() => {});
    return JSON.stringify(about);
  });
  await step("updated build reports up to date", async () => {
    await conn.page.getByRole("button", { name: "Check for updates" }).click();
    await sleep(8000);
    const about = await readAbout(conn.page);
    if (!about.upToDate) throw new Error(JSON.stringify(about));
    return JSON.stringify(about);
  });
  await conn.browser.close().catch(() => {});
  killApp();
}

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
const failed = report.steps.filter((s) => !s.ok);
console.log(`\n${report.steps.length - failed.length}/${report.steps.length} steps passed`);
process.exit(failed.length ? 1 : 0);
