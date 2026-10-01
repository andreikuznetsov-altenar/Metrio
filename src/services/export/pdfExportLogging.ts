import { writeLog } from '../../platform/logger';
import type { PerformanceExportView } from './types';
import type { PdfExportErrorCode } from './pdfExportMessages';
import { sanitizePdfDiagnosticMessage } from './pdfExportMessages';

export type PdfExportStage =
  | 'payload'
  | 'render'
  | 'array_buffer'
  | 'dialog'
  | 'write'
  | 'open';

export async function logPdfExportEvent(input: {
  stage: PdfExportStage;
  outcome: 'ok' | 'cancelled' | 'error';
  view?: PerformanceExportView;
  sectionCount?: number;
  targetExtension?: string;
  errorCode?: PdfExportErrorCode;
  errorClass?: string;
  errorMessage?: string;
}): Promise<void> {
  const platform =
    typeof navigator !== 'undefined' && navigator.platform ? navigator.platform : 'unknown';
  const parts = [
    `stage=${input.stage}`,
    `outcome=${input.outcome}`,
    input.view ? `view=${input.view}` : null,
    input.sectionCount !== undefined ? `sections=${input.sectionCount}` : null,
    input.targetExtension ? `ext=${input.targetExtension}` : null,
    `platform=${platform}`,
    input.errorCode ? `code=${input.errorCode}` : null,
    input.errorClass ? `errorClass=${input.errorClass}` : null,
    input.errorMessage ? `message=${sanitizePdfDiagnosticMessage(input.errorMessage)}` : null,
  ].filter(Boolean);

  await writeLog(
    input.outcome === 'error' ? 'warn' : 'info',
    'app',
    'pdf_export',
    parts.join(' '),
  );
}
