import { describe, it, expect } from "vitest";
import { validateInsights, suppressDismissed } from "@/lib/writing/insights";

const DOC_LEN = 200;

describe("validateInsights — fails closed", () => {
  it("returns [] for non-array / garbage input", () => {
    expect(validateInsights(null, DOC_LEN)).toEqual([]);
    expect(validateInsights("nope", DOC_LEN)).toEqual([]);
    expect(validateInsights({ foo: 1 }, DOC_LEN)).toEqual([]);
  });

  it("keeps valid insights and drops invalid ones (bad kind, range, oversize)", () => {
    const raw = {
      insights: [
        { kind: "ask_clarity", from: 0, to: 20, severity: "high", message: "Ask is buried.", rationale: "It's an email." },
        { kind: "not_a_kind", from: 0, to: 5, message: "x" }, // bad kind
        { kind: "redundancy", from: 50, to: 40, message: "y", rationale: "z" }, // from >= to
        { kind: "tone_fit", from: 10, to: 9999, message: "out of range", rationale: "r" }, // to > docLen
        { kind: "voice_drift", from: 30, to: 60, message: "Drifts formal.", rationale: "Voice." },
      ],
    };
    const out = validateInsights(raw, DOC_LEN);
    expect(out.map((i) => i.kind)).toEqual(["ask_clarity", "voice_drift"]);
    for (const i of out) {
      expect(i.from).toBeLessThan(i.to);
      expect(i.to).toBeLessThanOrEqual(DOC_LEN);
      expect(i.id.length).toBeGreaterThan(0);
    }
  });

  it("caps at three total", () => {
    const raw = Array.from({ length: 6 }, (_, n) => ({
      kind: "redundancy",
      from: n * 10,
      to: n * 10 + 5,
      message: `m${n}`,
      rationale: "r",
    }));
    expect(validateInsights(raw, DOC_LEN)).toHaveLength(3);
  });
});

describe("suppressDismissed", () => {
  it("removes insights whose kind was dismissed for this document", () => {
    const insights = validateInsights(
      [
        { kind: "tone_fit", from: 0, to: 10, message: "casual", rationale: "r" },
        { kind: "redundancy", from: 20, to: 30, message: "dup", rationale: "r" },
      ],
      DOC_LEN,
    );
    const kept = suppressDismissed(insights, new Set(["tone_fit"]));
    expect(kept.map((i) => i.kind)).toEqual(["redundancy"]);
  });
});
