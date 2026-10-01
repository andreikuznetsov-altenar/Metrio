# Phase 5 — PDF export recovery audit

## Why export was not reachable (pre–Phase 5)

| Layer | State |
|-------|--------|
| **Dependency** | `@react-pdf/renderer` removed from `package.json` while `pdfExport.tsx` still imported it. |
| **Typecheck** | `tsconfig.json` excluded `pdfExport.tsx`, `PdfReportDocument.tsx`, `MetrioPdfLogo.tsx`, `pdfStyles.ts` — production build skipped the renderer pipeline. |
| **Vitest** | `vite.config.ts` excluded `pdfExport.test.tsx` and PDF components from the test graph. |
| **UI** | No Performance toolbar or page action called `exportPerformancePdf`. |
| **Data** | `buildPerformanceExportData.ts` remained wired to domain engines but had no bridge from `PerformanceDataContext`. |
| **Native** | Rust `write_user_selected_pdf` remained registered in `src-tauri/src/lib.rs` (unchanged). |

## Restored in Phase 5

- `@react-pdf/renderer@^4.9.0` (baseline-aligned)
- tsconfig includes all export modules
- `performanceExportBridge.ts` builds payloads from `PerformanceFetchResult` (no refetch, no fixtures)
- `PerformanceExportContext` + toolbar **Export PDF** → save dialog → `write_user_selected_pdf` → open file
- Tests: `pdfExport.test.tsx`, existing export unit tests
