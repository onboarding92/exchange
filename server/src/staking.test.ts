/// <reference types="vitest" />

import { describe, it, expect } from "vitest";
import { calculateAccruedReward } from "./staking";

describe("calculateAccruedReward", () => {
  it("returns 0 if no time has passed", () => {
    const now = new Date();

    const position = {
      amount: 100,
      apr: 10,
      startedAt: now,
      closedAt: now,
      status: "closed",
    } as any;

    const reward = calculateAccruedReward(position);
    expect(reward).toBe(0);
  });

  it("returns a non-negative finite number for a valid period", () => {
    const start = new Date("2024-01-01T00:00:00.000Z");
    const end = new Date("2024-02-01T00:00:00.000Z");

    const position = {
      amount: 100,
      apr: 10,
      startedAt: start,
      closedAt: end,
      status: "closed",
    } as any;

    const reward = calculateAccruedReward(position);

    expect(reward).toSatisfy((v: unknown) => typeof v === "number");
    expect(Number.isFinite(reward)).toBe(true);
    expect(reward).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 for invalid dates", () => {
    const position = {
      amount: 100,
      apr: 10,
      startedAt: new Date("invalid"),
      closedAt: null,
      status: "active",
    } as any;

    const reward = calculateAccruedReward(position);
    expect(reward).toBe(0);
  });
});
