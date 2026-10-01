import { describe, expect, it } from 'vitest';
import {
  sanitizePdfDiagnosticMessage,
  userMessageForPdfExportError,
} from './pdfExportMessages';

describe('sanitizePdfDiagnosticMessage', () => {
  it('redacts secret-like substrings', () => {
    expect(sanitizePdfDiagnosticMessage('Invalid api_key=abc')).toContain('[redacted]');
  });

  it('preserves filesystem permission errors', () => {
    const msg = 'forbidden path: not allowed on the configured scope';
    expect(sanitizePdfDiagnosticMessage(msg)).toBe(msg);
  });
});

describe('userMessageForPdfExportError', () => {
  it('maps write failures to save location copy', () => {
    expect(userMessageForPdfExportError('pdf_write_failed')).toBe(
      "Couldn't save the PDF to the selected location.",
    );
  });
});
