import { useState } from "react";
import { AppHeader, type DemoSection } from "./AppHeader";
import { AppShell } from "./AppShell";
import { useTheme } from "./ThemeProvider";
import { ScrollArea } from "../components/ui/ScrollArea";
import { Select } from "../components/ui/Select";
import { FoundationPage } from "../pages/FoundationPage";

/** Phase 0–1 component gallery — dev only, not shipped in production builds. */
export function FoundationDevApp() {
  const { preference, setPreference } = useTheme();
  const [section, setSection] = useState<DemoSection>("performance");

  const toolbar = (
    <>
      <span className="type-label">Theme</span>
      <Select
        aria-label="Theme preference"
        value={preference}
        onChange={(event) =>
          setPreference(event.target.value as "light" | "dark" | "system")
        }
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
      />
      <span className="type-caption">Foundation gallery (dev)</span>
    </>
  );

  return (
    <AppShell
      header={
        <AppHeader activeSection={section} onSectionChange={setSection} />
      }
      toolbar={toolbar}
      footer="Fixed footer — scroll proof for Phase 0–1."
    >
      <ScrollArea data-testid="app-scroll-viewport">
        <FoundationPage />
      </ScrollArea>
    </AppShell>
  );
}
