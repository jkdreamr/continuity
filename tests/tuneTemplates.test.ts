import { describe, it, expect } from "vitest";
import {
  tuneTemplate,
  QUICK_ACTIONS,
  buildTransformInstruction,
  defaultAxisValues,
  isNeutral,
} from "@/lib/writing/tuneTemplates";

describe("tuneTemplate — dynamic slider templates (V8)", () => {
  it("uses Directness/Commitment level/Warmth for a formal email", () => {
    expect(tuneTemplate("manager_email").axes.map((a) => a.id)).toEqual(["directness", "commitment", "warmth"]);
    expect(tuneTemplate("investor_follow_up").axes.map((a) => a.id)).toEqual(["directness", "commitment", "warmth"]);
  });
  it("uses Compression/Conviction/Decision clarity for a product memo", () => {
    expect(tuneTemplate("memo").axes.map((a) => a.id)).toEqual(["compression", "conviction", "decision"]);
  });
  it("uses Confidence/Detail/Ask clarity for a founder update", () => {
    expect(tuneTemplate("post").axes.map((a) => a.id)).toEqual(["confidence", "detail", "ask"]);
  });
  it("uses Safety/Structure/Specificity for build prompts", () => {
    expect(tuneTemplate("build").axes.map((a) => a.id)).toEqual(["safety", "structure", "specificity"]);
  });
  it("always exposes exactly three axes with endpoint labels", () => {
    for (const kind of ["manager_email", "memo", "post", "reply", "build", "other"] as const) {
      const t = tuneTemplate(kind);
      expect(t.axes).toHaveLength(3);
      for (const a of t.axes) {
        expect(a.lowLabel.length).toBeGreaterThan(0);
        expect(a.highLabel.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("quick actions + instruction building", () => {
  it("exposes shorter / warmer / more direct presets with instructions", () => {
    const ids = QUICK_ACTIONS.map((a) => a.id);
    expect(ids).toContain("shorter");
    expect(ids).toContain("warmer");
    expect(ids).toContain("more_direct");
    for (const a of QUICK_ACTIONS) expect(a.instruction.length).toBeGreaterThan(10);
  });

  it("derives a plain-language instruction from the full axis vector", () => {
    const t = tuneTemplate("manager_email");
    const instruction = buildTransformInstruction(t, { directness: 90, commitment: 50, warmth: 15 });
    expect(instruction.toLowerCase()).toMatch(/direct|lead with/);
    expect(instruction.toLowerCase()).toMatch(/crisp|business/);
  });

  it("treats an all-centered vector as neutral (restore original)", () => {
    const t = tuneTemplate("memo");
    expect(isNeutral(t, defaultAxisValues(t))).toBe(true);
    expect(isNeutral(t, { ...defaultAxisValues(t), conviction: 90 })).toBe(false);
  });

  it("provides centered defaults", () => {
    const t = tuneTemplate("memo");
    const d = defaultAxisValues(t);
    expect(Object.keys(d).sort()).toEqual(["compression", "conviction", "decision"]);
    for (const v of Object.values(d)) expect(v).toBe(50);
  });
});
