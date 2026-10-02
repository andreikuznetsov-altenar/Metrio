import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import type { OperationalDigest } from "../../domain/digests/digestTypes";
import "./digest-drawer.css";

export interface DigestDrawerProps {
  digest: OperationalDigest | null;
  open: boolean;
  onClose: () => void;
}

export function DigestDrawer({ digest, open, onClose }: DigestDrawerProps) {
  const copy = () => {
    if (!digest?.plainText) return;
    void navigator.clipboard.writeText(digest.plainText);
  };

  return (
    <Drawer
      open={open && digest != null}
      onClose={onClose}
      ariaLabel={digest?.periodLabel ?? "Brief"}
      size="analytics"
      className="drawer--digest"
      header={
        digest ? (
          <div className="digest-drawer__header">
            <h2 className="digest-drawer__title">{digest.periodLabel}</h2>
            <p className="digest-drawer__meta">{digest.sinceLabel}</p>
          </div>
        ) : null
      }
    >
      {digest ? (
        <div className="digest-drawer__body" data-testid="digest-drawer">
          {digest.sections.map((section) => (
            <section key={section.id} className="digest-drawer__section">
              <h3>{section.title}</h3>
              {section.lines.length ? (
                <ul>
                  {section.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="digest-drawer__muted">Nothing to report.</p>
              )}
            </section>
          ))}
          <div className="digest-drawer__actions">
            <Button type="button" variant="secondary" onClick={copy}>
              Copy brief
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
