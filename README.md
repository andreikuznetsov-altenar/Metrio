# Metrio

Clean desktop foundation (Phase 0–1): Tauri 2, React, TypeScript, Vite.

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run tauri dev
npm run tauri build
```

Fixed window: **1180×760**, non-resizable, native title bar.

## Phase notes

- **Foundation gallery:** `npm run dev` only (`FoundationDevApp`). Production builds use a minimal product placeholder until auth ships.
- **Auth / first-run:** follow [`docs/auth-phase-spec.md`](docs/auth-phase-spec.md) (work email + Jira token + Bamboo key; fixed Altenar URLs in `src/config/company.ts`).
