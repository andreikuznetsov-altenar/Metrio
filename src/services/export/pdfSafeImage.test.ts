import { describe, expect, it } from 'vitest';
import {
  isReactPdfCompatibleSvgMarkup,
  sanitizePdfImageSrc,
} from './pdfSafeImage';

describe('pdfSafeImage', () => {
  it('rejects SVG markup with CSS font stacks (packaged render killer)', () => {
    const bad = `<svg xmlns="http://www.w3.org/2000/svg"><text font-family="Helvetica, Arial, sans-serif">Altenar</text></svg>`;
    expect(isReactPdfCompatibleSvgMarkup(bad)).toBe(false);
  });

  it('rejects SVG markup with font-weight on text', () => {
    const bad = `<svg xmlns="http://www.w3.org/2000/svg"><text font-weight="700">Altenar</text></svg>`;
    expect(isReactPdfCompatibleSvgMarkup(bad)).toBe(false);
  });

  it('rejects fontless SVG text wordmark markup', () => {
    const ok = `<svg xmlns="http://www.w3.org/2000/svg"><text font-size="28" fill="#0B3D2E">Altenar</text></svg>`;
    expect(isReactPdfCompatibleSvgMarkup(ok)).toBe(false);
  });

  it('sanitizes incompatible SVG data URLs to null', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text font-family="Helvetica, Arial, sans-serif">Altenar</text></svg>`;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    expect(sanitizePdfImageSrc(dataUrl)).toBeNull();
  });

  it('keeps PNG data URLs', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(sanitizePdfImageSrc(png)).toBe(png);
  });

  it('keeps compatible paths-only SVG data URLs', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><path d="M1 1H19V9H1Z" fill="#0070F0"/></svg>`;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    expect(sanitizePdfImageSrc(dataUrl)).toBe(dataUrl);
  });
});
