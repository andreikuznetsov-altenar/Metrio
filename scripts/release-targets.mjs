/**
 * Single source of truth for the platforms every Metrio release ships.
 * Workflow, manifest generator, verifiers and tests all derive from this list, so a platform
 * can never point at another platform's artifacts.
 *
 * `updaterPlatform` is the key tauri-plugin-updater looks up (`{os}-{arch}` of the RUNNING binary,
 * see `tauri_plugin_updater::target()`); `lipoArch` (macOS) is what `lipo -archs` must report.
 *
 * macOS updater payload: a tar.gz of the stapled .app. Windows updater payload: the NSIS installer
 * itself (Tauri v2), whose `.sig` is the TAURI UPDATER signature - it is NOT Authenticode.
 */
export const RELEASE_TARGETS = [
  { id: "aarch64", os: "macos", rustTarget: "aarch64-apple-darwin", updaterPlatform: "darwin-aarch64", lipoArch: "arm64" },
  { id: "x86_64", os: "macos", rustTarget: "x86_64-apple-darwin", updaterPlatform: "darwin-x86_64", lipoArch: "x86_64" },
  { id: "windows-x86_64", os: "windows", rustTarget: "x86_64-pc-windows-msvc", updaterPlatform: "windows-x86_64" },
];

export const MAC_TARGETS = RELEASE_TARGETS.filter((t) => t.os === "macos");
export const WINDOWS_TARGET = RELEASE_TARGETS.find((t) => t.os === "windows");

/** File the updater downloads for this platform (and its `.sig` sits next to it). */
export const updaterArchiveName = (target, version) =>
  target.os === "windows" ? `Metrio_${version}_x86_64-setup.exe` : `Metrio_${target.id}.app.tar.gz`;
export const dmgName = (version, target) => `Metrio_${version}_${target.id}.dmg`;
export const bundleDir = (target) =>
  target.os === "windows"
    ? `src-tauri/target/${target.rustTarget}/release/bundle/nsis`
    : `src-tauri/target/${target.rustTarget}/release/bundle/macos`;

/** Target whose updater archive has this file name, or undefined. */
export function targetForArchive(fileName, version) {
  return RELEASE_TARGETS.find((t) => updaterArchiveName(t, version) === fileName);
}
