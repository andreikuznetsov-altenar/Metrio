import { useTheme } from "../theme/ThemeProvider";
import type { ThemePreference } from "../theme/theme";
import "../shell/AppHeader.css";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function PlaygroundAppHeader() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="app-header app-header--playground">
      <div className="app-header__start">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden />
          <span className="app-header__title">Metrio</span>
        </div>
      </div>
      <div className="app-header__actions">
        <div
          className="app-header__theme-toggle"
          role="group"
          aria-label="Theme"
        >
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={preference === option.value ? "is-active" : undefined}
              aria-pressed={preference === option.value}
              onClick={() => setPreference(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
