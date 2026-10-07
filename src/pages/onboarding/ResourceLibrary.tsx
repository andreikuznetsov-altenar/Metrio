import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Drawer } from "../../components/Drawer/Drawer";
import { DrawerPanelPlaceholder } from "../../components/Drawer/DrawerPanelPlaceholder";
import { Input } from "../../components/Input/Input";
import { ResourceRow } from "../../components/ResourceRow/ResourceRow";
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
}

export function ResourceLibrary({
  open,
  onClose,
  resources,
  byGroup,
  title = "Resources",
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
      size="person"
      className="resource-library-drawer"
      header={<h2 className="resource-library__drawer-title">{title}</h2>}
    >
      <div className="resource-library" data-testid="resource-library">
        <Input
          id="resource-library-search"
          type="search"
          label="Search resources"
          placeholder="Search resources"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {groupEntries.length === 0 ? (
          <DrawerPanelPlaceholder
            className="resource-library__empty"
            compact
            icon={<Search size={24} strokeWidth={1.75} aria-hidden />}
            title="No resources match your search."
          />
        ) : (
          groupEntries.map(([group, items]) => (
            <section key={group} className="resource-library__group" aria-label={GROUP_LABELS[group]}>
              <h3 className="resource-library__group-title">{GROUP_LABELS[group]}</h3>
              <div className="resource-library__list">
                {items.map((item) => (
                  <ResourceRow
                    key={item.id}
                    title={item.title}
                    subtitle={item.description}
                    source={item.source}
                    onOpen={() => void openOnboardingResourceTarget(item.target)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </Drawer>
  );
}
