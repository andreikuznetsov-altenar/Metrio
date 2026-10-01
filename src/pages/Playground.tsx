import { PlaygroundAppHeader } from "./PlaygroundAppHeader";
import { AppShell } from "../components/AppShell/AppShell";
import { Badge } from "../components/Badge/Badge";
import { Button } from "../components/Button/Button";
import { Card } from "../components/Card/Card";
import { IconButton } from "../components/IconButton/IconButton";
import { Input } from "../components/Input/Input";
import { ScrollArea } from "../components/ScrollArea/ScrollArea";
import { Select } from "../components/Select/Select";
import { Tabs } from "../components/Tabs/Tabs";
import { Tooltip } from "../components/Tooltip/Tooltip";
import { useTheme } from "../theme/ThemeProvider";
import "./Playground.css";

const TOKEN_SWATCHES = [
  { name: "background", varName: "--color-background" },
  { name: "surface", varName: "--color-surface" },
  { name: "surface-secondary", varName: "--color-surface-secondary" },
  { name: "border", varName: "--color-border" },
  { name: "text-primary", varName: "--color-text-primary" },
  { name: "text-secondary", varName: "--color-text-secondary" },
  { name: "accent", varName: "--color-accent" },
  { name: "danger", varName: "--color-danger" },
] as const;

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Playground() {
  const { resolved } = useTheme();

  return (
    <AppShell
      header={<PlaygroundAppHeader />}
      pageHeader={
        <div className="playground-page-header">
          <h2 className="playground-page-header__title">Component playground</h2>
          <span className="playground-page-header__meta">
            Resolved theme: {resolved}
          </span>
        </div>
      }
      footer={
        <div className="playground__footer">
          <span className="playground__footer-text">
            Fixed bottom action area (Phase 1 shell demo)
          </span>
          <div className="playground__row">
            <Button variant="secondary">Cancel</Button>
            <Button>Save draft</Button>
          </div>
        </div>
      }
    >
      <ScrollArea>
        <div className="playground">
          <div className="playground__intro">
            <h2>Phase 1 UI foundation</h2>
            <p>
              Static playground for core primitives. Only this viewport scrolls
              vertically; the app shell header and footer remain fixed.
            </p>
          </div>

          <div className="playground__grid">
            <Card title="Buttons" description="Primary, secondary, ghost">
              <div className="playground__section">
                <div className="playground__row">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                </div>
                <div className="playground__row">
                  <Tooltip content="Add item">
                    <IconButton label="Add">
                      <PlusIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton label="Add disabled" disabled>
                    <PlusIcon />
                  </IconButton>
                </div>
              </div>
            </Card>

            <Card title="Form controls" description="Input and select">
              <div className="playground__stack">
                <Input label="Project name" placeholder="Metrio rebuild" />
                <Input label="Disabled input" placeholder="Read only" disabled />
                <Input label="Error state" placeholder="Invalid value" error defaultValue="Bad input" />
                <Select
                  label="Workspace"
                  defaultValue="prod"
                  options={[
                    { value: "prod", label: "Production" },
                    { value: "staging", label: "Staging" },
                    { value: "dev", label: "Development" },
                  ]}
                />
              </div>
            </Card>

            <Card title="Tabs">
              <Tabs
                items={[
                  {
                    value: "overview",
                    label: "Overview",
                    content: "Overview panel content for the playground.",
                  },
                  {
                    value: "metrics",
                    label: "Metrics",
                    content: "Metrics panel with lightweight analytics copy.",
                  },
                  {
                    value: "disabled",
                    label: "Disabled",
                    content: "Unavailable",
                    disabled: true,
                  },
                ]}
              />
            </Card>

            <Card title="Badges">
              <div className="playground__row">
                <Badge>Neutral</Badge>
                <Badge variant="accent">Accent</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
              </div>
            </Card>
          </div>

          <section className="playground__section">
            <h3 className="playground__section-title">Semantic tokens</h3>
            <div className="playground__tokens">
              {TOKEN_SWATCHES.map((token) => (
                <div key={token.name} className="playground__swatch">
                  <div
                    className="playground__swatch-color"
                    style={{ background: `var(${token.varName})` }}
                  />
                  <div className="playground__swatch-label">{token.name}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="playground__section">
            <h3 className="playground__section-title">Scroll viewport</h3>
            <div className="playground__spacer-block">
              Tall content block — shell headers stay fixed
            </div>
          </section>
        </div>
      </ScrollArea>
    </AppShell>
  );
}
