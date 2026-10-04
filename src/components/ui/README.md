# Legacy Foundation UI (`src/components/ui`)

**Dev / Foundation gallery only.** Imported by `FoundationDevApp` and `FoundationPage` when `import.meta.env.DEV` and `#foundation` hash.

Production Metrio uses canonical primitives under `src/components/Button`, `Input`, `Select`, `Card`, etc.

Do **not** import from `src/components/ui/**` in product routes (`AuthenticatedApp`, `pages/**`, `shell/**`).
