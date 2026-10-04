import { PRODUCT_NAME } from './product';

export type BuildChannel = 'development' | 'internal-beta' | 'production';

export interface BuildInfo {
  version: string;
  commit: string;
  channel: BuildChannel;
  productName: string;
}

function normalizeChannel(value: string | undefined): BuildChannel {
  if (value === 'internal-beta' || value === 'production' || value === 'development') {
    return value;
  }
  return 'development';
}

/** Canonical frontend build metadata — do not hardcode version strings in UI. */
export function getBuildInfo(): BuildInfo {
  return {
    version: import.meta.env.VITE_APP_VERSION || '0.1.0',
    commit: import.meta.env.VITE_GIT_COMMIT || 'dev',
    channel: normalizeChannel(import.meta.env.VITE_BUILD_CHANNEL),
    productName: PRODUCT_NAME,
  };
}

/** Local / review builds ship with placeholder commit metadata. */
export function isNonReleaseBuild(info: BuildInfo = getBuildInfo()): boolean {
  const commit = info.commit.trim();
  if (!commit || commit === 'dev' || commit === 'local') return true;
  if (commit.length < 7) return true;
  return false;
}

export function formatBuildChannelLabel(info: BuildInfo = getBuildInfo()): string {
  if (info.channel === 'internal-beta') {
    return 'Internal beta build';
  }
  if (info.channel === 'production') {
    return isNonReleaseBuild(info) ? 'Review build' : 'Production';
  }
  return 'Development build';
}

export function formatBuildVersionLine(info: BuildInfo = getBuildInfo()): string {
  return `Version ${info.version}`;
}

/** Human-readable channel line — never mixes contradictory labels (e.g. Production · dev). */
export function formatBuildChannelLine(info: BuildInfo = getBuildInfo()): string {
  const channel = formatBuildChannelLabel(info);
  if (isNonReleaseBuild(info)) {
    return channel;
  }
  const short = info.commit.trim().slice(0, 7);
  return short ? `${channel} · ${short}` : channel;
}

/** Compact single-line label for diagnostics exports. */
export function formatBuildLabel(info: BuildInfo = getBuildInfo()): string {
  return `${info.productName} ${info.version} · ${formatBuildChannelLine(info)}`;
}

export function isUpdaterAvailableForBuild(info: BuildInfo = getBuildInfo()): boolean {
  return info.channel === 'production' && !isNonReleaseBuild(info);
}
