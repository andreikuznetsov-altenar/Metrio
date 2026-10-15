/**
 * Single source of truth for the macOS architectures every Metrio release ships.
 * Workflow, manifest generator, verifiers and tests all derive from this list, so a platform
 * can never point at another architecture's artifacts.
 *
 * `updaterPlatform` is the key tauri-plugin-updater looks up (`{os}-{arch}` of the RUNNING binary,
 * see `tauri_plugin_updater::target()`); `lipoArch` is what `lipo -archs` must report.
 */
export const RELEASE_TARGETS = [
  {
    id: "aarch64",
    rustTarget: "aarch64-apple-darwin",
    updaterPlatform: "darwin-aarch64",
    lipoArch: "arm64",
  },
  {
    id: "x86_64",
    rustTarget: "x86_64-apple-darwin",
    updaterPlatform: "darwin-x86_64",
    lipoArch: "x86_64",
  },
];

export const updaterArchiveName = (target) => `Metrio_${target.id}.app.tar.gz`;
export const dmgName = (version, target) => `Metrio_${version}_${target.id}.dmg`;
export const bundleDir = (target) => `src-tauri/target/${target.rustTarget}/release/bundle/macos`;

/** Target whose updater archive has this file name, or undefined. */
export function targetForArchive(fileName) {
  return RELEASE_TARGETS.find((t) => updaterArchiveName(t) === fileName);
}
