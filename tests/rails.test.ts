import { describe, it, expect } from "vitest";
import {
  WRITING_RAILS,
  BUILD_RAILS,
  railsFor,
  defaultRails,
  railBand,
  phraseFor,
  getRail,
} from "@/lib/rails";

describe("railBand", () => {
  it("classifies low / mid / high with stable thresholds", () => {
    expect(railBand(0)).toBe("low");
    expect(railBand(33)).toBe("low");
    expect(railBand(34)).toBe("mid");
    expect(railBand(50)).toBe("mid");
    expect(railBand(66)).toBe("mid");
    expect(railBand(67)).toBe("high");
    expect(railBand(100)).toBe("high");
  });
});

describe("rail sets", () => {
  it("exposes the five writing rails from the spec", () => {
    expect(WRITING_RAILS.map((r) => r.id)).toEqual([
      "length",
      "directness",
      "register",
      "stance",
      "fidelity",
    ]);
  });

  it("exposes the four build rails from the spec", () => {
    expect(BUILD_RAILS.map((r) => r.id)).toEqual([
      "structure",
      "expression",
      "boldness",
      "behavior",
    ]);
  });

  it("returns the right set per mode", () => {
    expect(railsFor("writing")).toBe(WRITING_RAILS);
    expect(railsFor("build")).toBe(BUILD_RAILS);
  });

  it("builds a default rail map covering every rail id", () => {
    const d = defaultRails("writing");
    expect(Object.keys(d).sort()).toEqual(
      [...WRITING_RAILS.map((r) => r.id)].sort(),
    );
    for (const v of Object.values(d)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("phraseFor (intent-rail language mapping)", () => {
  it("maps a rail value to a concrete instruction that changes by band", () => {
    const length = getRail("length")!;
    const low = phraseFor(length, 10);
    const high = phraseFor(length, 90);
    expect(low).toMatch(/concise|short|cut/i);
    expect(high).toMatch(/room|develop|expand/i);
    expect(low).not.toEqual(high);
  });

  it("preserve-phrasing rail locks wording at the low end", () => {
    const fidelity = getRail("fidelity")!;
    expect(phraseFor(fidelity, 5)).toMatch(/preserve|keep my wording|fixed/i);
    expect(phraseFor(fidelity, 95)).toMatch(/reframe|rewrite/i);
  });
});
