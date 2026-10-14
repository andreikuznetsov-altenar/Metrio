// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DashboardYourManagerCard } from "./DashboardYourManagerCard";
import type { ResolvedEmployee } from "../../../services/bamboo/orgResolver";

const openExternalUrl = vi.fn();
vi.mock("../../../platform/openExternal", () => ({
  openExternalUrl: (url: string) => openExternalUrl(url),
}));
vi.mock("../../../components/PersonIdentity/PersonIdentity", () => ({
  PersonIdentity: ({ displayName, role }: { displayName: string; role?: string }) => (
    <div data-testid="identity">
      {displayName} {role}
    </div>
  ),
}));

const manager = (workEmail?: string): ResolvedEmployee =>
  ({ id: "m1", displayName: "Elena Rossi", jobTitle: "Design Manager", workEmail, department: "Design" }) as ResolvedEmployee;

describe("Your manager contact", () => {
  beforeEach(() => openExternalUrl.mockClear());

  it("renders the email as a plain inline text link (not a button control) opening mailto: externally", async () => {
    render(<DashboardYourManagerCard manager={manager("elena.rossi@altenar.com")} />);
    const link = screen.getByTestId("dashboard-your-manager-email");
    expect(link.className).toContain("metrio-text-link");
    expect(link.className).not.toMatch(/ui-button|btn/);
    expect(link.textContent).toBe("elena.rossi@altenar.com");
    await userEvent.click(link);
    expect(openExternalUrl).toHaveBeenCalledWith("mailto:elena.rossi@altenar.com");
  });

  it("does NOT rewrite an authoritative real email from the source", () => {
    render(<DashboardYourManagerCard manager={manager("someone@partner-corp.org")} />);
    expect(screen.getByTestId("dashboard-your-manager-email").textContent).toBe("someone@partner-corp.org");
  });

  it("shows no email and no Slack item when the source provides none (no fabricated links)", () => {
    const { container } = render(<DashboardYourManagerCard manager={manager(undefined)} />);
    expect(screen.queryByTestId("dashboard-your-manager-email")).toBeNull();
    expect(container.textContent).not.toMatch(/slack/i);
  });

  it("Bamboo field audit: Metrio requests no Slack field, so no Slack contact can be shown", () => {
    const resolver = readFileSync(resolve(process.cwd(), "src/services/bamboo/orgResolver.ts"), "utf8");
    const fields = resolver.slice(resolver.indexOf("const EMPLOYEE_FIELDS"), resolver.indexOf("];", resolver.indexOf("const EMPLOYEE_FIELDS")));
    expect(fields).not.toMatch(/slack/i);
  });

  it("CSS: identity + contact form one left-aligned, vertically centred stack", () => {
    const css = readFileSync(resolve(process.cwd(), "src/pages/home/dashboard/dashboard-your-manager.css"), "utf8");
    expect(css).toMatch(/\.dashboard-your-manager__body\s*\{[^}]*flex-direction:\s*column[^}]*align-items:\s*flex-start/);
    expect(css).toMatch(/\.dashboard-your-manager__body\s*\{[^}]*justify-content:\s*center/);
  });
});
