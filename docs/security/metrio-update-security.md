# Metrio update security

## Trust chain

1. **Apple Developer ID** — `Metrio.app` is signed with Developer ID Application (Team **V36L7T43H8**), hardened runtime, notarized and stapled for distribution.
2. **Tauri updater minisign** — Update archives (`.tar.gz`) are signed with a **separate** updater keypair. Only the **public** key is embedded in `tauri.conf.json`. The app refuses to install if signature verification fails.
3. **HTTPS** — Production updater endpoints must use TLS. The placeholder invalid host in dev configs is replaced at release time.

## Secret boundaries

| Secret | Allowed location |
|--------|------------------|
| Apple signing certificate | macOS Keychain |
| Notary API key / Apple ID app password | CI secrets or local env for release only |
| `TAURI_SIGNING_PRIVATE_KEY` | GitHub Actions secrets or secure release machine — **never git** |
| GitHub PAT for private repo | CI only — **never** in the desktop app |

## Artifact hosting

- Host `latest.json` and updater archives on HTTPS readable without embedding credentials in Metrio.
- DMG remains the authoritative manual install path for IT allowlisting (SHA256 recorded per release).

## User experience

- No silent install: user confirms **Install update** in Settings → About.
- Signature or download failures leave the existing app unchanged.
- Software updates are **not** mixed into the operational Action Inbox.

## Recovery

Reinstall a previous version from a retained notarized DMG. Preferences and credentials live in app data and Keychain and are preserved across upgrades unless a migration explicitly changes storage (tested in release QA).
