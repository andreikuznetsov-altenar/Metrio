import { useEffect, useState } from "react";
import { Switch } from "../components/Switch/Switch";
import "./SwitchVisualFixturePage.css";

/** Playwright-only switch states gallery (VITE_VISUAL_FIXTURE + #switch-visual). */
export function SwitchVisualFixturePage() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const theme = localStorage.getItem("metrio-theme") === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <div className="switch-visual-fixture" data-testid="switch-visual-fixture">
      <div className="switch-visual-fixture__grid">
        <Switch
          data-testid="switch-visual-off"
          checked={false}
          onCheckedChange={() => {}}
          aria-label="Off"
        />
        <Switch
          data-testid="switch-visual-on"
          checked={on}
          onCheckedChange={setOn}
          aria-label="On"
        />
        <Switch
          data-testid="switch-visual-disabled-off"
          checked={false}
          disabled
          onCheckedChange={() => {}}
          aria-label="Disabled off"
        />
        <Switch
          data-testid="switch-visual-disabled-on"
          checked
          disabled
          onCheckedChange={() => {}}
          aria-label="Disabled on"
        />
        <Switch
          data-testid="switch-visual-focus-off"
          checked={false}
          onCheckedChange={() => {}}
          aria-label="Focus off"
        />
        <Switch
          data-testid="switch-visual-focus-on"
          checked
          onCheckedChange={() => {}}
          aria-label="Focus on"
        />
      </div>
    </div>
  );
}
