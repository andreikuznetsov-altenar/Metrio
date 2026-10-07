let exportActive = false;

export function isPdfExportInProgress(): boolean {
  return exportActive;
}

export type PdfExportMutexResult<T> =
  | { status: "ok"; value: T }
  | { status: "busy" };

export async function withPdfExportMutex<T>(
  run: () => Promise<T>,
): Promise<PdfExportMutexResult<T>> {
  if (exportActive) {
    return { status: "busy" };
  }
  exportActive = true;
  try {
    const value = await run();
    return { status: "ok", value };
  } finally {
    exportActive = false;
  }
}
