import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectionProvider } from "../app/ConnectionContext";
import { CurrentUserProvider } from "../app/CurrentUserContext";
import { ConnectionScreen } from "./ConnectionScreen";
import { ThemeProvider } from "../theme/ThemeProvider";

vi.mock("../platform/openExternal", () => ({
  openExternalUrl: vi.fn(async () => undefined),
}));

vi.mock("../app/connectionStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/connectionStorage")>();
  return {
    ...actual,
    readSavedConnection: vi.fn(async () => null),
    performConnection: vi.fn(async () => undefined),
  };
});

function renderAuth() {
  return render(
    <ThemeProvider>
      <CurrentUserProvider>
        <ConnectionProvider>
          <ConnectionScreen />
        </ConnectionProvider>
      </CurrentUserProvider>
    </ThemeProvider>,
  );
}

function panel() {
  return within(screen.getByTestId("connection-screen"));
}

afterEach(() => {
  cleanup();
});

describe("ConnectionScreen", () => {
  it("disables submit until Altenar email and credentials are filled", async () => {
    const user = userEvent.setup();
    renderAuth();

    const submit = panel().getByRole("button", { name: /connect & continue/i });
    expect(submit).toBeDisabled();

    await user.type(panel().getByLabelText(/work email/i), "user@gmail.com");
    await user.type(panel().getByLabelText(/^api token$/i), "token");
    await user.type(panel().getByLabelText(/^api key$/i), "key");
    expect(submit).toBeDisabled();

    await user.clear(panel().getByLabelText(/work email/i));
    await user.type(panel().getByLabelText(/work email/i), "user@altenar.com");
    expect(submit).toBeEnabled();
  });

  it("shows email error after blur with invalid domain", async () => {
    const user = userEvent.setup();
    renderAuth();

    const email = panel().getByLabelText(/work email/i);
    await user.type(email, "user@gmail.com");
    await user.tab();

    expect(panel().getByRole("alert")).toHaveTextContent("@altenar.com");
  });

  it("renders token help links", () => {
    renderAuth();
    expect(panel().getByRole("button", { name: /^get api token$/i })).toBeInTheDocument();
    expect(panel().getByRole("button", { name: /how to get api key/i })).toBeInTheDocument();
    expect(panel().getByText(/credentials are stored securely/i)).toBeInTheDocument();
  });

  it("renders canonical Metrio logo and connection form", () => {
    renderAuth();
    const logo = panel().getByTestId("connection-screen-logo");
    expect(logo).toHaveAttribute("src", "/Logo.svg");
    expect(logo).toHaveAccessibleName("Metrio");
    expect(panel().getByRole("heading", { name: /connect your work tools/i })).toBeInTheDocument();
    expect(panel().getByLabelText(/work email/i)).toBeInTheDocument();
  });
});
