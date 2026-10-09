import { COMPANY_CONFIG } from '../../config/company';

const BUNDLED_ALTENAR_LOGO_PATH = '/company/altenar-logo.svg';

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Company logo for PDF header — canonical bundled Altenar asset for this build. */
export async function resolveCompanyPdfLogoDataUrl(): Promise<{ src: string; source: string }> {
  const bundled = await fetchAsDataUrl(BUNDLED_ALTENAR_LOGO_PATH);
  if (bundled) {
    return {
      src: bundled,
      source: `bundled:${BUNDLED_ALTENAR_LOGO_PATH} (${COMPANY_CONFIG.companyWebsiteUrl})`,
    };
  }
  return { src: '', source: 'unavailable' };
}
