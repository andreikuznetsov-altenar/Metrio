export type PdfExportErrorCode =
  | 'pdf_payload_failed'
  | 'pdf_render_failed'
  | 'pdf_dialog_failed'
  | 'pdf_write_failed'
  | 'pdf_open_failed';

const SECRET_PATTERN = /token|api[_-]?key|password|secret/gi;

export function sanitizePdfDiagnosticMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return 'Unknown error';
  return trimmed.replace(SECRET_PATTERN, '[redacted]');
}

export function userMessageForPdfExportError(code: PdfExportErrorCode, _sanitizedDetail?: string): string {
  switch (code) {
    case 'pdf_payload_failed':
      return "Couldn't prepare the PDF report. Try refreshing and export again.";
    case 'pdf_render_failed':
      return "Couldn't create the PDF. Try again.";
    case 'pdf_dialog_failed':
      return "Couldn't open the save dialog. Try again.";
    case 'pdf_write_failed':
      return "Couldn't save the PDF to the selected location.";
    case 'pdf_open_failed':
      return "PDF saved, but couldn't open it automatically.";
    default:
      return "Couldn't export the PDF. Try again.";
  }
}

export const PDF_EXPORT_CANCELLED_MESSAGE = 'PDF export was cancelled.';
