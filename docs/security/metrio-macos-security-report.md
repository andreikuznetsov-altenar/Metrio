# Metrio macOS security report (Phase 18)

| Field | Value |
|-------|--------|
| Product | Metrio |
| Version | 0.1.0 |
| Git SHA (Phase 18 worktree) | `c378b42` (local; **not pushed** — signing gate) |
| Bundle ID | `com.altenar.metrio` |
| Baseline | `1dd603826edab6f5d4dc1b61b966ed7245c24aa8` |

## Executive summary

Corporate Security (SentinelOne) reported **persistence_deception** on an **unsigned** local build with parent **launchd** and **Launch at login** disabled in defaults but potentially enabled in testing.

This phase:

1. Audited persistence — **only Tauri `LaunchAgent` autostart** (no duplicate mechanisms).
2. Fixed **`--minimized`** handling so login startup hides the main window.
3. Prepared **Hardened Runtime + entitlements + Tauri macOS bundle** config for **Developer ID** signing via environment variables.
4. **Did not** complete Developer ID signing, notarization, stapling, or Gatekeeper acceptance — **Developer ID Application certificate not installed** on the build host (see below).
5. **Did not** claim SentinelOne remediation — EDR retest on signed/notarized `/Applications` install is **pending**.

Detailed persistence notes: [`metrio-macos-persistence-audit.md`](./metrio-macos-persistence-audit.md)  
Build runbook: [`developer-id-build.md`](./developer-id-build.md)

## Autostart mechanism

| Item | Detail |
|------|--------|
| API | `@tauri-apps/plugin-autostart` + `tauri-plugin-autostart` |
| macOS mode | `MacosLauncher::LaunchAgent` |
| Plist | `~/Library/LaunchAgents/Metrio.plist` |
| Label | `Metrio` |
| Args | `<path-to-metrio-binary>`, `--minimized` |
| RunAtLoad | `true` |
| KeepAlive | not set |
| User default | `launchAtLogin: false` |
| Enable path | Settings → General → Launch at login only |

## Signing identity (audit host)

```text
security find-identity -v -p codesigning

1) Apple Development: Andrei Kuznetsov (5NKWG6S8R4)
0) Developer ID Application identities
```

**Developer ID Application certificate not installed.**

Do **not** ship with Apple Development or ad-hoc `-` for internal corporate distribution.

| Attribute | Status |
|-----------|--------|
| Developer ID subject | _Not available — cert missing_ |
| Apple Team ID (10-char) | _Obtain from Developer ID cert or Apple Developer membership after install_ |
| Personal vs org signing | Bundle ID remains `com.altenar.metrio`; Security decides acceptability |

## Hardened Runtime & entitlements

| Item | Status |
|------|--------|
| Hardened Runtime | Enabled in `tauri.conf.json` (`bundle.macOS.hardenedRuntime`) |
| App Sandbox | **Not** enabled (intentional) |
| Entitlements file | `src-tauri/Entitlements.plist` — JIT, network client/server for Tauri/WebView and API calls |

## codesign / notarization / Gatekeeper

| Step | Result (Phase 18) |
|------|-------------------|
| `codesign --verify --deep --strict` | **Not run on Developer ID build** — no cert |
| Notarization | **Not submitted** |
| `stapler validate` | **N/A** |
| `spctl --assess` | **N/A** on notarized bundle |

Unsigned release bundle (if built locally) remains **Signature Verification: Not signed** — consistent with SentinelOne observation.

## SHA256 (Security artifacts)

Generate after **signed** DMG is produced:

```bash
shasum -a 256 /path/to/Metrio.dmg
shasum -a 256 "/Applications/Metrio.app/Contents/MacOS/metrio"
```

Record exact values in this section when available. Do not substitute development `target/` paths for allowlisting.

## Security test matrix (SentinelOne)

| State | Launch at login | Expected observation |
|-------|-----------------|----------------------|
| A | OFF | Unsigned dev build — baseline detection reported by Security |
| B | ON | Unsigned dev build + LaunchAgent — higher persistence signal |
| C | OFF | Signed/notarized `/Applications` — _retest pending_ |
| D | ON | Signed/notarized + LaunchAgent — _retest pending_ |

**Do not** disable SentinelOne. Record actual alerts per cell when tested.

Interpretation guide (non-causal):

- Only A/B fire → signing/trust likely primary factor.
- C clean, D fires → LaunchAgent may still be flagged; evaluate SMAppService with Security.
- C and D clean → signing + clean install likely sufficient.

## Allowlist support (for Security team)

When Developer ID build exists, provide:

- Developer ID certificate subject (CN)
- Apple Team ID
- Bundle ID `com.altenar.metrio`
- Notarization ticket / staple status
- SHA256 of DMG and main executable
- Git release SHA

Metrio does **not** modify SentinelOne policy.

## Background behavior summary

See persistence audit for emitter intervals (Jira 30m, Bamboo 60m, survey 15m). Tray close hides window when **Keep running in tray** is on; distinct from Launch at login.

## Secret audit

No Apple passwords, `.p12`, `.p8`, or notary secrets committed. Signing uses environment variables at build time only.

## SentinelOne

**Issue not verified as fixed.** Retest required on signed, notarized app installed under `/Applications` with matrix above.
