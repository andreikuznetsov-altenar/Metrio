/** PDF-safe path text (Helvetica lacks Unicode arrows). */
export function formatPdfSafePath(path: string): string {
  return path
    .replace(/\u21A9\s*/g, '(backflow) ')
    .replace(/\u2192/g, ' -> ')
    .replace(/\u2190/g, '<-')
    .replace(/\s+/g, ' ')
    .trim();
}
