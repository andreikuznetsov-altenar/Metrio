import { pdf, renderToBuffer } from '@react-pdf/renderer';
import { invoke } from '@tauri-apps/api/core';
import type React from 'react';
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
import { withPdfExportMutex } from './pdfExportMutex';
import { buildArchivedReportFilename } from '../../domain/reports/reportHistoryFilename';
import {
  archiveExportedReport,
} from '../reports/reportHistoryStore';
import { notifyReportHistoryChanged } from '../reports/reportHistoryEvents';

export type PdfExportResult =
  | { status: 'saved'; path: string }
  | { status: 'cancelled'; message: string }
  | { status: 'error'; code: PdfExportErrorCode; message: string; userMessage: string };

function errorClass(error: unknown): string {
  if (error instanceof Error) return error.name;
  return typeof error;
}

function isNodeRuntime(): boolean {
  const proc = (globalThis as { process?: { versions?: { node?: string } } }).process;
  return Boolean(proc?.versions?.node);
}

async function pdfDocumentToBytes(
  document: React.ReactElement,
  doc: ReturnType<typeof pdf>,
): Promise<Uint8Array> {
  let toBlobError: unknown;
  try {
    const blob = await doc.toBlob();
    if (typeof blob.arrayBuffer === 'function') {
      return new Uint8Array(await blob.arrayBuffer());
    }
  } catch (error) {
    toBlobError = error;
  }

  // renderToBuffer is Node-only. In packaged WebView, never mask the real toBlob error.
  if (isNodeRuntime()) {
    try {
      const buffer = await renderToBuffer(
        document as Parameters<typeof renderToBuffer>[0],
      );
      return new Uint8Array(buffer);
    } catch (bufferError) {
      throw toBlobError ?? bufferError;
    }
  }

  throw (
    toBlobError ??
    new Error('PDF toBlob failed and renderToBuffer is unavailable in this runtime')
  );
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
  const document = <PdfReportDocument payload={normalized} />;
  let bytes: Uint8Array;
  try {
    bytes = await pdfDocumentToBytes(document, pdf(document));
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const stackHint =
      error instanceof Error && error.stack
        ? error.stack.split('\n').slice(0, 4).join(' | ')
        : undefined;
    await logPdfExportEvent({
      stage: 'render',
      outcome: 'error',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
      errorCode: 'pdf_render_failed',
      errorClass: errorClass(error),
      errorMessage: [rawMessage, stackHint, payload.teamLayout ? 'layout=team' : 'layout=sections']
        .filter(Boolean)
        .join(' :: '),
    });
    throw error;
  }

  if (bytes.length < 5 || new TextDecoder().decode(bytes.slice(0, 4)) !== '%PDF') {
    const invalid = new Error('Rendered PDF bytes are invalid');
    await logPdfExportEvent({
      stage: 'array_buffer',
      outcome: 'error',
      view: payload.view,
      sectionCount: payload.sections.length,
      targetExtension: 'pdf',
      errorCode: 'pdf_render_failed',
      errorClass: errorClass(invalid),
      errorMessage: invalid.message,
    });
    throw invalid;
  }
  return bytes;
}

async function writePdfToUserPath(path: string, bytes: Uint8Array): Promise<string> {
  const result = await invoke<{ path: string }>('write_user_selected_pdf', {
    path,
    bytes: Array.from(bytes),
  });
  return result.path;
}

async function exportPerformancePdfOnce(
  payload: PerformanceExportPayload,
): Promise<PdfExportResult> {
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

  const defaultName = buildPdfFilename(payload.view, {
    dateFrom: payload.reportRange?.from,
    dateTo: payload.reportRange?.to,
  });
  let defaultPath = defaultName;
  try {
    const { documentDir, join } = await import('@tauri-apps/api/path');
    defaultPath = await join(await documentDir(), 'Metrio', 'Reports', defaultName);
  } catch {
    defaultPath = defaultName;
  }
  let path: string | null;
  try {
    path = await save({
      defaultPath,
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
    const createdAt = new Date().toISOString();
    const archiveFilename = buildArchivedReportFilename(new Date(createdAt));
    try {
      await archiveExportedReport(bytes, createdAt, archiveFilename);
      notifyReportHistoryChanged();
    } catch (archiveError) {
      await logPdfExportEvent({
        stage: 'write',
        outcome: 'error',
        view: payload.view,
        sectionCount: payload.sections.length,
        targetExtension: 'pdf',
        errorCode: 'pdf_write_failed',
        errorClass: errorClass(archiveError),
        errorMessage:
          archiveError instanceof Error ? archiveError.message : String(archiveError),
      });
    }
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

export async function exportPerformancePdf(
  payload: PerformanceExportPayload,
): Promise<PdfExportResult | { status: 'busy' }> {
  const result = await withPdfExportMutex(() => exportPerformancePdfOnce(payload));
  if (result.status === 'busy') {
    return { status: 'busy' };
  }
  return result.value;
}

export async function revealExportedPdfInFolder(
  path: string,
): Promise<PdfExportResult | { status: 'revealed' }> {
  const trimmed = path.trim();
  if (!trimmed) {
    return toExportError('pdf_open_failed', new Error('Empty file path'));
  }
  try {
    await invoke('reveal_exported_pdf_in_folder', { path: trimmed });
    await logPdfExportEvent({ stage: 'open', outcome: 'ok' });
    return { status: 'revealed' };
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

export async function openExportedPdf(path: string): Promise<PdfExportResult | { status: 'opened' }> {
  const trimmed = path.trim();
  if (!trimmed) {
    return toExportError('pdf_open_failed', new Error('Empty file path'));
  }
  try {
    await invoke('open_exported_pdf', { path: trimmed });
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
