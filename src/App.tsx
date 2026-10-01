import { useState } from "react";
import { AppHeader, type DemoSection } from "./app/AppHeader";
import { AppShell } from "./app/AppShell";
import { ThemeProvider, useTheme } from "./app/ThemeProvider";
import { ScrollArea } from "./components/ui/ScrollArea";
import { Select } from "./components/ui/Select";
import { FoundationPage } from "./pages/FoundationPage";

function AppContent() {
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
      <span className="type-caption">
        Demo nav: {section} (foundation content always shown for approval)
      </span>
    </>
  );

  return (
    <AppShell
      header={
        <AppHeader activeSection={section} onSectionChange={setSection} />
      }
      toolbar={toolbar}
      footer="Fixed footer — header, toolbar, and footer do not scroll."
    >
      <ScrollArea data-testid="app-scroll-viewport">
        <FoundationPage />
      </ScrollArea>
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
