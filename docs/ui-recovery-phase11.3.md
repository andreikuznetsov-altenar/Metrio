# Phase 11.3 — residual analytics UI polish

## Toolbar date display

- **State** remains ISO `yyyy-MM-dd` (`PerformanceDateRange.from` / `.to`).
- **Editing** uses native `<input type="date">` (calendar picker unchanged).
- **Visible label** is `formatPerformanceDateDisplay()` → `dd MMM yyyy` (e.g. `02 Sep 2026`), rendered in `.performance-toolbar__date-display` with a transparent date input overlay for clicks.
- Avoids ambiguous `MM/DD/YYYY` locale rendering without adding a custom date-picker library.

## Trend chart fill (11.3 fix)

Recharts `url(#trend-fill-First pass)` was invalid because SVG ids cannot contain spaces → broken gradient → default gray fill on First pass. Charts now use accent stroke + `fillOpacity` (~10%) on the same accent color.
