import { pdf } from '@react-pdf/renderer';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { PdfReportDocument } from './PdfReportDocument';
import type { PerformanceExportPayload } from './types';
import { buildPdfFilename } from './pdfFilename';
import { normalizePerformanceExportPayload } from './pdfNormalize';
import {
  PDF_EXPORT_CANCELLED_MESSAGE,
  type PdfExportErrorCode,
  sanitizePdfDiagnosticMessage,
  userMessageForPdfExportError,
} from './pdfExportMessages';
import { logPdfExportEvent } from './pdfExportLogging';

export type PdfExportResult =
  | { status: 'saved'; path: string }
  | { status: 'cancelled'; message: string }
  | { status: 'error'; code: PdfExportErrorCode; message: string; userMessage: string };

function errorClass(error: unknown): string {
  if (error instanceof Error) return error.name;
  return typeof error;
}

function toExportError(code: PdfExportErrorCode, error: unknown): PdfExportResult {
  const raw = error instanceof Error ? error.message : String(error);
  const message = sanitizePdfDiagnosticMessage(raw);
  return {
    status: 'error',
    code,
    message,
    userMessage: userMessageForPdfExportError(code, message),
  };
}

export async function renderPerformancePdfBytes(payload: PerformanceExportPayload): Promise<Uint8Array> {
  const normalized = normalizePerformanceExportPayload(payload);
  let blob: Blob;
  try {
    blob = await pdf(<PdfReportDocument payload={normalized} />).toBlob();
  } catch (error) {
    await logPdfExportEvent({
      stage: 'render',
      outcome: 'error',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
      errorCode: 'pdf_render_failed',
      errorClass: errorClass(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 5 || new TextDecoder().decode(bytes.slice(0, 4)) !== '%PDF') {
      throw new Error('Rendered PDF bytes are invalid');
    }
    return bytes;
  } catch (error) {
    await logPdfExportEvent({
      stage: 'array_buffer',
      outcome: 'error',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
      errorCode: 'pdf_render_failed',
      errorClass: errorClass(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function writePdfToUserPath(path: string, bytes: Uint8Array): Promise<string> {
  const result = await invoke<{ path: string }>('write_user_selected_pdf', {
    path,
    bytes: Array.from(bytes),
  });
  return result.path;
}

export async function exportPerformancePdf(payload: PerformanceExportPayload): Promise<PdfExportResult> {
  let bytes: Uint8Array;
  try {
    bytes = await renderPerformancePdfBytes(payload);
    await logPdfExportEvent({
      stage: 'render',
      outcome: 'ok',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
    });
  } catch (error) {
    return toExportError('pdf_render_failed', error);
  }

  const defaultName = buildPdfFilename(payload.view);
  let path: string | null;
  try {
    path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
  } catch (error) {
    await logPdfExportEvent({
      stage: 'dialog',
      outcome: 'error',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
      errorCode: 'pdf_dialog_failed',
      errorClass: errorClass(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return toExportError('pdf_dialog_failed', error);
  }

  if (!path) {
    await logPdfExportEvent({
      stage: 'dialog',
      outcome: 'cancelled',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
    });
    return { status: 'cancelled', message: PDF_EXPORT_CANCELLED_MESSAGE };
  }

  try {
    const savedPath = await writePdfToUserPath(path, bytes);
    await logPdfExportEvent({
      stage: 'write',
      outcome: 'ok',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
    });
    return { status: 'saved', path: savedPath };
  } catch (error) {
    await logPdfExportEvent({
      stage: 'write',
      outcome: 'error',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
      errorCode: 'pdf_write_failed',
      errorClass: errorClass(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return toExportError('pdf_write_failed', error);
  }
}

export async function openExportedPdf(path: string): Promise<PdfExportResult | { status: 'opened' }> {
  try {
    const { openPath } = await import('@tauri-apps/plugin-opener');
    await openPath(path);
    await logPdfExportEvent({ stage: 'open', outcome: 'ok' });
    return { status: 'opened' };
  } catch (error) {
    await logPdfExportEvent({
      stage: 'open',
      outcome: 'error',
      errorCode: 'pdf_open_failed',
      errorClass: errorClass(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return toExportError('pdf_open_failed', error);
  }
}
