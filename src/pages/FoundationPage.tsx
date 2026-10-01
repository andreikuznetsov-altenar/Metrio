import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { IconButton } from "../components/ui/IconButton";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { Tooltip } from "../components/ui/Tooltip";
import { Info } from "lucide-react";
import "./FoundationPage.css";

function ComponentPreview({ theme }: { theme: "light" | "dark" }) {
  const [tab, setTab] = useState("one");

  return (
    <div className="foundation-preview__canvas" data-theme-preview={theme}>
      <div className="foundation-row">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button disabled>Disabled</Button>
      </div>

      <div className="foundation-row">
        <IconButton label="Info">
          <Info size={16} />
        </IconButton>
        <Tooltip content="Compact tooltip">
          <IconButton label="Tooltip demo">
            <Info size={16} />
          </IconButton>
        </Tooltip>
      </div>

      <Input label="Default input" placeholder="Placeholder" />
      <Input label="Filled input" defaultValue="user@altenar.com" />
      <Input label="Error input" error placeholder="Invalid" />
      <Input label="Disabled input" disabled placeholder="Disabled" />

      <Select
        label="Select"
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ]}
        defaultValue="a"
      />

      <Tabs
        aria-label="Demo tabs"
        value={tab}
        onChange={setTab}
        items={[
          { id: "one", label: "Tab one" },
          { id: "two", label: "Tab two" },
        ]}
      />
      <TabPanel id="one" activeId={tab}>
        <p className="type-body-small">First tab content.</p>
      </TabPanel>
      <TabPanel id="two" activeId={tab}>
        <p className="type-body-small">Second tab content.</p>
      </TabPanel>

      <Card title="Card" description="Restrained surface with subtle border.">
        <div className="foundation-row">
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Success</Badge>
        </div>
      </Card>
    </div>
  );
}

export function FoundationPage() {
  return (
    <div className="foundation-page">
      <div className="foundation-page__intro">
        <h1 className="type-display">Foundation</h1>
        <p className="type-body-small">
          Internal component gallery for Phase 0–1 visual approval. Product screens are
          intentionally not built yet.
        </p>
      </div>

      <div className="foundation-page__grid">
        <div className="foundation-preview">
          <div className="foundation-preview__label">Light preview</div>
          <ComponentPreview theme="light" />
        </div>
        <div className="foundation-preview">
          <div className="foundation-preview__label">Dark preview</div>
          <ComponentPreview theme="dark" />
        </div>
      </div>

      <Card title="Scroll proof" description="Only the viewport below the header scrolls.">
        {Array.from({ length: 24 }, (_, index) => (
          <div key={index} className="foundation-scroll-block">
            Scroll block {index + 1} — fixed window 1180×760, no horizontal overflow.
          </div>
        ))}
      </Card>
    </div>
  );
}
