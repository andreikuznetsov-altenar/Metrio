import { useMemo, useState } from "react";
import { Drawer } from "../../components/Drawer/Drawer";
import { Button } from "../../components/Button/Button";
import type { OnboardingResource, OnboardingResourceGroup } from "../../domain/onboarding/resourceTypes";
import { filterOnboardingResources } from "../../domain/onboarding/matchOnboardingResources";
import { openOnboardingResourceTarget } from "../../platform/openOnboardingResource";
import "./resource-library.css";

const GROUP_LABELS: Record<OnboardingResourceGroup, string> = {
  company: "Company",
  department: "My department",
  team_projects: "My team & projects",
  tools: "Tools",
  policies: "Policies",
};

export interface ResourceLibraryProps {
  open: boolean;
  onClose: () => void;
  resources: OnboardingResource[];
  byGroup: Partial<Record<OnboardingResourceGroup, OnboardingResource[]>>;
  title?: string;
  copyUrlLabel?: string;
}

export function ResourceLibrary({
  open,
  onClose,
  resources,
  byGroup,
  title = "Resources",
  copyUrlLabel = "Copy link",
}: ResourceLibraryProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterOnboardingResources(resources, query),
    [resources, query],
  );

  const filteredByGroup = useMemo(() => {
    if (!query.trim()) return byGroup;
    const groups: Partial<Record<OnboardingResourceGroup, OnboardingResource[]>> = {};
    for (const item of filtered) {
      const list = groups[item.group] ?? [];
      list.push(item);
      groups[item.group] = list;
    }
    return groups;
  }, [byGroup, filtered, query]);

  const groupEntries = Object.entries(filteredByGroup) as [
    OnboardingResourceGroup,
    OnboardingResource[],
  ][];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={title}
      header={<h2 className="resource-library__drawer-title">{title}</h2>}
      className="resource-library-drawer"
    >
      <div className="resource-library" data-testid="resource-library">
        <input
          type="search"
          className="resource-library__search"
          placeholder="Filter by title, group, or source"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter resources"
        />
        {groupEntries.length === 0 ? (
          <p className="resource-library__empty">No resources match your filter.</p>
        ) : (
          groupEntries.map(([group, items]) => (
            <section key={group} className="resource-library__group" aria-label={GROUP_LABELS[group]}>
              <h3 className="resource-library__group-title">{GROUP_LABELS[group]}</h3>
              <ul className="resource-library__list">
                {items.map((item) => (
                  <li key={item.id} className="resource-library__row">
                    <div className="resource-library__row-body">
                      <span className="resource-library__row-title">{item.title}</span>
                      {item.description ? (
                        <span className="resource-library__row-meta">{item.description}</span>
                      ) : null}
                      <span className="resource-library__row-source">{item.source}</span>
                    </div>
                    <div className="resource-library__row-actions">
                      <Button
                        variant="secondary"
                        onClick={() => void openOnboardingResourceTarget(item.target)}
                      >
                        Open
                      </Button>
                      {urlFromTarget(item.target) ? (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            void navigator.clipboard?.writeText(urlFromTarget(item.target)!)
                          }
                        >
                          {copyUrlLabel}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </Drawer>
  );
}

function urlFromTarget(target: OnboardingResource["target"]): string | null {
  if (target.kind === "bamboo_portal" || target.kind === "metrio_resources") {
    return null;
  }
  return target.url || null;
}
