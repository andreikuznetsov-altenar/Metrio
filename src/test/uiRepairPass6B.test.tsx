import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyReadonlySummary } from "../pages/settings/CompanyReadonlySummary";
import { AboutSettingsPanel } from "../pages/settings/AboutSettingsPanel";
import { COMPANY_CONFIG } from "../config/company";
import { UpdateProvider } from "../app/UpdateContext";

const settingsCss = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../pages/settings/settings.css"),
  "utf8",
);

vi.mock("../platform/openExternal", () => ({
  openExternalUrl: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => ({
    version: "0.1.0",
    commit: "dev",
    channel: "production",
    product_name: "Metrio",
  })),
}));

describe("UI repair pass 6B — settings", () => {
  afterEach(() => cleanup());

  it("uses wide settings layout without extra horizontal padding override", () => {
    expect(settingsCss).toContain("max-width: 1320px");
    expect(settingsCss).not.toMatch(/max-width:\s*760px/);
    expect(settingsCss).not.toMatch(/padding:\s*0\s+var\(--space-6\)/);
  });

  it("styles switch stacks with row dividers", () => {
    expect(settingsCss).toContain(".settings-toggle-stack > .settings-toggle-row");
    expect(settingsCss).toContain("border-bottom");
  });

  it("renders company website link and feature badges without Bamboo support URL", () => {
    render(
      <CompanyReadonlySummary
        publicInfo={{
          displayName: "Altenar",
          supportUrl: COMPANY_CONFIG.bambooPortalUrl,
          enabledFeatures: ["confluence", "feedback"],
        }}
      />,
    );
    const link = screen.getByRole("link", { name: /Altenar website/i });
    expect(link).toHaveAttribute("href", COMPANY_CONFIG.companyWebsiteUrl);
    expect(screen.queryByText(/bamboohr\.com/i)).toBeNull();
    expect(screen.getByText(/Confluence/i)).toBeInTheDocument();
    expect(screen.getByText(/Feedback/i)).toBeInTheDocument();
  });

  it("shows structured about card with mailto and review updater copy", () => {
    render(
      <UpdateProvider>
        <AboutSettingsPanel embedded />
      </UpdateProvider>,
    );
    expect(screen.getByTestId("about-meta")).toBeInTheDocument();
    const mail = screen.getByRole("link", { name: /andrei\.kuznetsov@altenar\.com/i });
    expect(mail).toHaveAttribute("href", "mailto:andrei.kuznetsov@altenar.com");
    expect(screen.getByText(/Created by/i)).toBeInTheDocument();
    expect(screen.getByTestId("about-update-status")).toHaveTextContent(
      /Updates are unavailable in this review build/i,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
