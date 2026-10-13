# Metrio updater and release process

Metrio updates itself through the Tauri updater using **GitHub Releases**.

- Endpoint (in `src-tauri/tauri.conf.json`):
  `https://github.com/andreikuznetsov-altenar/Metrio/releases/latest/download/latest.json`
- Updater public key: `plugins.updater.pubkey` (minisign key id `71456F81A4D6472A`).
- **0.1.1 is the migration baseline.** Earlier builds were signed with an abandoned updater key and
  cannot update over the air; testers install 0.1.1 manually once. Every later release must be signed
  with the same permanent key.

## Two different signing identities

| Purpose | Identity |
| --- | --- |
| Apple code signing / notarization | Developer ID Application: Andrei Kuznetsov (V36L7T43H8), bundle id `com.altenar.metrio`, notary profile `Metrio-notary` |
| Updater artifact signing | The permanent Tauri updater key (below) |

## Permanent updater key

- Private key: `~/.tauri/metrio-updater.key` (outside the repository, mode 600). Never commit it.
- Password: macOS Keychain item `metrio-updater-key-password`
  (`security find-generic-password -s metrio-updater-key-password -w`).
- **Back up the key file and the password** in a password manager. Losing them again means another
  migration baseline. Do not rotate the key in a normal release.
- GitHub Actions secrets: `TAURI_SIGNING_PRIVATE_KEY` (key contents) and
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## Release flow

1. Bump `version` in `package.json`, run `node scripts/sync-app-version.mjs` (updates `Cargo.toml` and
   `tauri.conf.json`), update `package-lock.json`, commit, and push `main`.
2. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`. The *Release macOS* workflow checks the
   tag equals every version source, builds the exact tag, signs with Developer ID, signs the updater
   archive with the updater key, generates `latest.json` from the real `.sig`, verifies it
   (`scripts/verify-updater-artifacts.mjs`), and publishes the DMG, `Metrio.app.tar.gz`,
   `Metrio.app.tar.gz.sig` and `latest.json` to the same release.
3. Local alternative: `npm run release:macos` (reads the key from `~/.tauri/metrio-updater.key` into `TAURI_SIGNING_PRIVATE_KEY` and the password from the Keychain).

`latest.json` follows the Tauri v2 static manifest schema; `signature` is the **content** of the
`.sig` file, never a URL.

## Runtime behaviour

- One automatic check shortly after startup, then about every 6 hours. Failures never block the app.
- "Update available" modal: **Update and restart** / **Later**. Nothing installs without the user.
- Settings → Company & App → *Check for updates* runs a manual check.
