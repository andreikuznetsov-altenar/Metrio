import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CurrentUserProvider } from "./app/CurrentUserContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { applyTheme, getStoredThemePreference } from "./theme/theme";
import "./styles/globals.css";

applyTheme(getStoredThemePreference());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <CurrentUserProvider>
        <App />
      </CurrentUserProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
