import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES } from "../../platform/preferences";
import { OperationalRulesSettingsPanel } from "./OperationalRulesSettingsPanel";

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({ data: null }),
}));

/**
 * Review-stage thresholds are compared with weekday stage ages, so their units say "weekdays".
 * "No activity" and "vacation soon" are calendar-day rules and keep "days".
 */
describe("Attention rules units", () => {
  afterEach(() => cleanup());

  const suffixOf = (labelText: string): string => {
    const field = screen.getByText(labelText).closest(".settings-field");
    return field?.querySelector(".settings-number-field__suffix")?.textContent ?? "";
  };

  it("labels the two stage-age thresholds in weekdays and leaves calendar-day rules alone", () => {
    render(<OperationalRulesSettingsPanel prefs={DEFAULT_PREFERENCES} onPersist={async () => undefined} />);
    expect(suffixOf("Flag Review after")).toBe("weekdays");
    expect(suffixOf("Long Review threshold")).toBe("weekdays");
    const noActivity = document.querySelector("#no-activity-days")?.closest(".settings-field");
    expect(noActivity?.querySelector(".settings-number-field__suffix")?.textContent).toBe("days");
    const vacation = document.querySelector("#vacation-soon-days")?.closest(".settings-field");
    expect(vacation?.querySelector(".settings-number-field__suffix")?.textContent).toBe("days");
  });
});
