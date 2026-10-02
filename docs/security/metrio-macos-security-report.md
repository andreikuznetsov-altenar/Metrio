# Metrio macOS security report (Phase 18)

| Field | Value |
|-------|--------|
| Product | Metrio |
| Version | 0.1.0 |
| Git SHA | `b4836d8` (+ final security doc commit) |
| Bundle ID | `com.altenar.metrio` |
| Baseline | `1dd603826edab6f5d4dc1b61b966ed7245c24aa8` |

## Executive summary

Corporate Security (SentinelOne) reported **persistence_deception** on an **unsigned** development build (`Signature Verification: Not signed`, parent **launchd**).

Phase 18 delivered:

1. Persistence audit — **Tauri LaunchAgent only**, user-controlled, default **Launch at login OFF**.
2. **`--minimized`** honored at startup (tray/background without main window).
3. **Developer ID** signed + **notarized** distributable (Team **V36L7T43H8**).
4. **Installed** security candidate: **`/Applications/Metrio.app`** (from stapled DMG).
5. Autostart plist targets **`/Applications/Metrio.app/Contents/MacOS/metrio`** with **`--minimized`** when enabled from Settings.

**SentinelOne retest on the installed build is not available from automated CI** — Corporate Security must record new console events (see matrix below). Do **not** treat unsigned dev detections as equivalent to the notarized `/Applications` build.

Related: [`metrio-macos-persistence-audit.md`](./metrio-macos-persistence-audit.md), [`developer-id-build.md`](./developer-id-build.md)

---

## Signing & notarization

| Item | Value |
|------|--------|
| Developer ID | Developer ID Application: Andrei Kuznetsov (V36L7T43H8) |
| Team ID | **V36L7T43H8** |
| Bundle ID | **com.altenar.metrio** |
| Hardened Runtime | **Enabled** (`flags=0x10000(runtime)`) |
| Secure timestamp | **Present** (e.g. 02 Oct 2026 at 18:01:41 on build) |
| Notarization submission | **290eb6bf-0216-44a6-ac7f-140e39401709** |
| Notarization status | **Accepted** |
| Stapler (DMG in `target/release/bundle/dmg/`) | **The validate action worked!** |
| Stapler (build-tree `.app`) | **The validate action worked!** |
| Stapler (`/Applications/Metrio.app`) | **The validate action worked!** after `xcrun stapler staple` post-copy |

### Gatekeeper (installed app)

```text
/Applications/Metrio.app: accepted
source=Notarized Developer ID
```

*(On some developer Macs `spctl` may also show `override=security disabled` if assessment policy is relaxed locally — corporate endpoints should use standard policy.)*

### Installed app codesign

```text
codesign --verify --deep --strict --verbose=2 /Applications/Metrio.app
→ valid on disk; satisfies its Designated Requirement

Authority=Developer ID Application: Andrei Kuznetsov (V36L7T43H8)
TeamIdentifier=V36L7T43H8
Identifier=com.altenar.metrio
```

---

## SHA256 (allowlist artifacts)

| Artifact | SHA256 |
|----------|--------|
| `Metrio_0.1.0_aarch64.dmg` (release bundle) | `1cb5d586deb7415711ec9e0406f69eb9d88d778e7c56de9b770744f22013670e` |
| `/Applications/Metrio.app/Contents/MacOS/metrio` | `0a7e1918c3a5af8063759cf8cab26818813a243522c248ce1b9ab0e02082e299` |

---

## Autostart (installed build)

| Item | Observed |
|------|----------|
| Mechanism | Tauri `@tauri-apps/plugin-autostart` → **LaunchAgent** |
| Plist path | `~/Library/LaunchAgents/Metrio.plist` |
| Label | `Metrio` |
| RunAtLoad | `true` |
| KeepAlive | **not set** |
| ProgramArguments | `["/Applications/Metrio.app/Contents/MacOS/metrio", "--minimized"]` |
| User default | `launchAtLogin: false` |
| Enable path | Settings → General → Launch at login |
| Disable cleanup | Plist **removed** when toggled OFF (verified) |
| Stale `target/` paths | **None** in plist when installed from `/Applications` |

**Keep running in tray** does not register LaunchAgent (separate preference).

---

## Installed QA (automated)

| Check | Result |
|-------|--------|
| Install source | DMG `Metrio_0.1.0_aarch64.dmg` → `/Applications/Metrio.app` |
| Process path | `/Applications/Metrio.app/Contents/MacOS/metrio` |
| Single instance (manual launch) | One process observed |
| `--minimized` argv | Process line includes `--minimized`; main window hidden at startup (Phase 18b) |
| Jira / Bamboo / UI smoke | **Manual** — app launches; connections depend on user credentials in prefs |

---

## SentinelOne test matrix

| Case | Build | Launch at login | Automated observation |
|------|-------|-----------------|------------------------|
| A (historical) | Unsigned dev | OFF/ON | Prior **persistence_deception** (Security report) |
| C | Signed + notarized `/Applications` | OFF | **Corporate console required** — no new events recorded in this automation |
| D | Signed + notarized `/Applications` | ON | **Corporate console required** — no new events recorded in this automation |

**Interpretation:** Pending Corporate Security confirmation. If **C and D are clean**, the prior detection likely related to **unsigned / non-notarized** or **non-`/Applications`** binaries — not a guarantee of zero future EDR alerts. If **D alone fires**, evaluate **SMAppService** with Security.

**Do not claim “SentinelOne fixed” without corporate retest.**

---

## Security handoff (allowlist)

| Field | Value |
|-------|--------|
| Product | Metrio 0.1.0 |
| Signer | Developer ID Application: Andrei Kuznetsov (V36L7T43H8) |
| Team ID | V36L7T43H8 |
| Bundle ID | com.altenar.metrio |
| Notarization | Accepted (submission `290eb6bf-0216-44a6-ac7f-140e39401709`) |
| Gatekeeper | Notarized Developer ID |
| DMG SHA256 | `1cb5d586deb7415711ec9e0406f69eb9d88d778e7c56de9b770744f22013670e` |
| Executable SHA256 | `0a7e1918c3a5af8063759cf8cab26818813a243522c248ce1b9ab0e02082e299` |
| Autostart | LaunchAgent, **default OFF**, user opt-in |

Security may allowlist by signer, Team ID, bundle ID, and/or hash — Metrio does not change SentinelOne policy.

---

## Secret audit

No Apple passwords, app-specific passwords, `.p12`, `.p8`, or notary secrets in git. CSR files should stay **untracked** (see `.gitignore`).

---

## Phase 20.1 release (icon refresh + Phase 20 app bundle)

Phase 20 updated application icon assets and frontend bundle content. **Phase 18 DMG / executable hashes below remain historical**; Security must allowlist the **Phase 20.1** artifacts for the current release.

| Field | Value |
|-------|--------|
| Git SHA | `a6535933490ef3079f1140971bc6d4a2ede5bc80` |
| Notarization submission | **7cd5c275-c7f9-4fc7-b639-ef15a1865107** |
| Notarization status | **Accepted** |
| Stapler (release DMG) | **The validate action worked!** |
| Stapler (release-tree `.app`) | **The validate action worked!** |
| Stapler (`/Applications/Metrio.app`) | **The validate action worked!** after install + staple |
| Gatekeeper (installed) | **accepted**, `source=Notarized Developer ID` |
| Bundle `icon.icns` (Phase 20) | SHA256 `a48449e6e4bb5e6c3f4e6e926c892dfd87a520e4abde54fd6fd4e1b8e88e7b85` (matches repo `src-tauri/icons/icon.icns`) |
| Tray icons | Unchanged (`tray-icon.png` / `tray-icon@2x.png`) |

### Phase 20.1 SHA256 (current allowlist)

| Artifact | SHA256 |
|----------|--------|
| `Metrio_0.1.0_aarch64.dmg` (release bundle, stapled) | `0ca577ae665bf8aaf59ed15abe4feb62c6561ff1d9a8182fc40e4b3a8d61f3ab` |
| `/Applications/Metrio.app/Contents/MacOS/metrio` (Phase 20.1 install) | `c2f64401fe7fd8cfd116066392faa793e35d2d28a1d61603c055fac46bd6bb30` |

Build signed with **Developer ID Application: Andrei Kuznetsov (V36L7T43H8)**, Team **V36L7T43H8**, Hardened Runtime enabled, secure timestamp present (02 Oct 2026).
