import { describe, expect, test } from "vitest";
import { eachIsoDateInRange, getLocalWeekday } from "@/lib/parse-local-date";

describe("parse-local-date", () => {
  test("2026-09-01 為星期二", () => {
    expect(getLocalWeekday("2026-09-01")).toBe(2);
  });

  test("區間包含起訖日", () => {
    expect(eachIsoDateInRange("2026-09-01", "2026-09-03")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
  });
});
