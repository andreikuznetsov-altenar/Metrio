import { Button } from "../../components/Button/Button";
import { TeamWorkloadDonut } from "../../components/charts/TeamWorkloadDonut";
import { Drawer } from "../../components/Drawer/Drawer";
import type { OperationalDigest } from "../../domain/digests/digestTypes";
import type { Person } from "../../domain/people/types";
import type { WorkloadRow } from "../../domain/performance";
import {
  digestSectionCards,
  formatDigestDrawerSubtitle,
  formatDigestDrawerTitle,
} from "../../domain/digests/digestDrawerFormat";
import "./digest-drawer.css";

export interface DigestDrawerProps {
  digest: OperationalDigest | null;
  open: boolean;
  onClose: () => void;
  teamWorkload?: WorkloadRow[];
  personsById?: Map<string, Person>;
}

export function DigestDrawer({
  digest,
  open,
  onClose,
  teamWorkload = [],
  personsById,
}: DigestDrawerProps) {
  const copy = () => {
    if (!digest?.plainText) return;
    void navigator.clipboard.writeText(digest.plainText);
  };

  const cards = digest ? digestSectionCards(digest) : [];

  return (
    <Drawer
      open={open && digest != null}
      onClose={onClose}
      ariaLabel={digest ? formatDigestDrawerTitle(digest) : "Brief"}
      size="analytics"
      className="drawer--digest"
      header={
        digest ? (
          <div className="digest-drawer__header">
            <h2 className="digest-drawer__title">
              {digest.kind === "weekly" ? "Weekly digest" : "Team brief"}
            </h2>
            <p className="digest-drawer__range">{formatDigestDrawerTitle(digest)}</p>
            <p className="digest-drawer__meta">{formatDigestDrawerSubtitle(digest)}</p>
          </div>
        ) : null
      }
      headerActions={
        digest ? (
          <Button type="button" variant="secondary" onClick={copy}>
            Copy brief
          </Button>
        ) : null
      }
    >
      {digest ? (
        <div className="digest-drawer__body" data-testid="digest-drawer">
          {digest.kind === "daily" && teamWorkload.length > 0 ? (
            <TeamWorkloadDonut
              workload={teamWorkload}
              context={{ mode: "own_team" }}
              personsById={personsById}
            />
          ) : null}
          {cards.map((card) => (
            <section key={card.id} className="digest-drawer__card">
              <h3 className="digest-drawer__card-title">{card.title}</h3>
              {card.metrics?.length ? (
                <div
                  className={
                    card.id === "week"
                      ? "digest-drawer__metric-grid digest-drawer__metric-grid--week"
                      : "digest-drawer__metric-grid"
                  }
                >
                  {card.metrics.map((metric) => (
                    <div key={`${card.id}-${metric.label}`} className="digest-drawer__metric">
                      <span className="digest-drawer__metric-label">{metric.label}</span>
                      <span className="digest-drawer__metric-value">{metric.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {card.body ? (
                <p className="digest-drawer__card-body">{card.body}</p>
              ) : null}
              {card.lines?.length ? (
                <ul className="digest-drawer__line-list">
                  {card.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
}
