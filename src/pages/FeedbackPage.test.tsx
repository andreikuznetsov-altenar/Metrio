import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FeedbackPage } from "./FeedbackPage";

describe("FeedbackPage", () => {
  it("renders survey delivery results and history navigation", async () => {
    const user = userEvent.setup();
    render(<FeedbackPage />);

    expect(screen.getByRole("button", { name: "Survey" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Results" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Results" }));
    expect(screen.getByText("Results appear after the first completed survey.")).toBeInTheDocument();
  });
});
