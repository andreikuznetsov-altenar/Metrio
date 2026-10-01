import { ScrollArea } from "../components/ui/ScrollArea";

/**
 * Production shell until auth + product routes land.
 * Auth phase: replace body with ConnectionScreen per docs/auth-phase-spec.md.
 */
export function ProductShellPlaceholder() {
  return (
    <ScrollArea data-testid="product-placeholder">
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
        }}
      >
        <p className="type-body-small" style={{ color: "var(--color-text-secondary)" }}>
          Metrio — product shell (auth phase next).
        </p>
      </div>
    </ScrollArea>
  );
}
