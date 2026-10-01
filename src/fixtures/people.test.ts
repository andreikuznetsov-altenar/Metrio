import { describe, expect, it } from "vitest";
import { getPerson } from "./people";

describe("getPerson", () => {
  it("returns fixture people by fixture id", () => {
    expect(getPerson("person-alex").name).toBe("Alex Morgan");
  });

  it("does not throw for production Bamboo employee ids", () => {
    expect(getPerson("1114")).toEqual({
      id: "1114",
      name: "Employee 1114",
      role: "employee",
    });
  });
});
