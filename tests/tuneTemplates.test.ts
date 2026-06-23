import { describe, it, expect } from "vitest";
import {
  tuneTemplate,
  QUICK_ACTIONS,
  buildTransformInstruction,
  defaultAxisValues,
} from "@/lib/writing/tuneTemplates";

describe("tuneTemplate — dynamic slider templates", () => {
  it("uses Directness/Warmth/Length for formal email", () => {
    expect(tuneTemplate("manager_email").axes.map((a) => a.id)).toEqual(["directness", "warmth", "length"]);
  });
  it("uses Compression/Conviction/Polish for a memo", () => {
    expect(tuneTemplate("memo").axes.map((a) => a.id)).toEqual(["compression", "conviction", "polish"]);
  });
  it("uses Faithfulness/Warmth/Brevity for a reply", () => {
    expect(tuneTemplate("reply").axes.map((a) => a.id)).toEqual(["faithfulness", "warmth", "brevity"]);
  });
  it("uses Safety/Structure/Expression for build prompts", () => {
    expect(tuneTemplate("build").axes.map((a) => a.id)).toEqual(["safety", "structure", "expression"]);
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
    const instruction = buildTransformInstruction(t, { directness: 90, warmth: 50, length: 15 });
    expect(instruction.toLowerCase()).toMatch(/direct|lead with/);
    expect(instruction.toLowerCase()).toMatch(/short|brief|trim/);
  });

  it("provides centered defaults", () => {
    const t = tuneTemplate("memo");
    const d = defaultAxisValues(t);
    expect(Object.keys(d).sort()).toEqual(["compression", "conviction", "polish"]);
    for (const v of Object.values(d)) expect(v).toBe(50);
  });
});
