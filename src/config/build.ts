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

export function formatBuildLabel(info: BuildInfo = getBuildInfo()): string {
  const channelLabel =
    info.channel === 'internal-beta'
      ? 'Internal Beta'
      : info.channel === 'production'
        ? 'Production'
        : 'Development';
  return `${info.productName} ${info.version} · ${channelLabel} · ${info.commit}`;
}
