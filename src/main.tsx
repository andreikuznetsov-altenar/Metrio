import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CurrentUserProvider } from "./app/CurrentUserContext";
import { RootErrorBoundary } from "./app/RootErrorBoundary";
import { bootLog, bootLogBuildIdentity } from "./app/bootDiagnostics";
import { ThemeProvider } from "./theme/ThemeProvider";
import { applyTheme, getStoredThemePreference } from "./theme/theme";
import "./styles/globals.css";

bootLog("01", "main.tsx loaded");
applyTheme(getStoredThemePreference());
void bootLogBuildIdentity();

function ThemeProviderMount({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bootLog("03", "ThemeProvider mounted");
  }, []);
  return <ThemeProvider>{children}</ThemeProvider>;
}

function CurrentUserProviderMount({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bootLog("04", "CurrentUserProvider mounted");
  }, []);
  return <CurrentUserProvider>{children}</CurrentUserProvider>;
}

bootLog("02", "React createRoot");
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProviderMount>
        <CurrentUserProviderMount>
          <App />
        </CurrentUserProviderMount>
      </ThemeProviderMount>
    </RootErrorBoundary>
  </React.StrictMode>,
);
