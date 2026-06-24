import { describe, it, expect } from "vitest";
import { validateInsights, suppressDismissed, mergeInsights } from "@/lib/writing/insights";
import type { DocumentInsight } from "@/types/continuity";

const DOC_LEN = 200;

function ins(partial: Partial<DocumentInsight> & { kind: DocumentInsight["kind"] }): DocumentInsight {
  return {
    id: `${partial.kind}-${partial.from ?? 0}`,
    from: 0,
    to: 10,
    severity: "medium",
    message: "m",
    rationale: "r",
    ...partial,
  };
}

describe("validateInsights — fails closed", () => {
  it("returns [] for non-array / garbage input", () => {
    expect(validateInsights(null, DOC_LEN)).toEqual([]);
    expect(validateInsights("nope", DOC_LEN)).toEqual([]);
    expect(validateInsights({ foo: 1 }, DOC_LEN)).toEqual([]);
  });

  it("keeps valid insights and drops invalid ones (bad kind, range, oversize)", () => {
    const raw = {
      insights: [
        { kind: "unclear_ask", from: 0, to: 20, severity: "high", message: "Ask is buried.", rationale: "It's an email.", safeAction: "Move ask up" },
        { kind: "not_a_kind", from: 0, to: 5, message: "x" }, // bad kind
        { kind: "overpromise", from: 50, to: 40, message: "y", rationale: "z" }, // from >= to
        { kind: "relationship_mismatch", from: 10, to: 9999, message: "out of range", rationale: "r" }, // to > docLen
        { kind: "decision_drift", from: 30, to: 60, message: "Drifts from a decision.", rationale: "Contract." },
      ],
    };
    const out = validateInsights(raw, DOC_LEN);
    expect(out.map((i) => i.kind)).toEqual(["unclear_ask", "decision_drift"]);
    expect(out[0]!.safeAction).toBe("Move ask up");
    for (const i of out) {
      expect(i.from).toBeLessThan(i.to);
      expect(i.to).toBeLessThanOrEqual(DOC_LEN);
      expect(i.id.length).toBeGreaterThan(0);
    }
  });

  it("caps at three total", () => {
    const raw = Array.from({ length: 6 }, (_, n) => ({
      kind: "overpromise",
      from: n * 10,
      to: n * 10 + 5,
      message: `m${n}`,
      rationale: "r",
    }));
    expect(validateInsights(raw, DOC_LEN)).toHaveLength(3);
  });
});

describe("mergeInsights — local-first, provider fills the rest", () => {
  it("keeps the local insight on overlap and drops the provider duplicate", () => {
    const local = [ins({ kind: "accidental_commitment", from: 0, to: 20, message: "local" })];
    const provider = [ins({ kind: "accidental_commitment", from: 5, to: 15, message: "provider" })];
    const merged = mergeInsights(local, provider);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.message).toBe("local");
  });

  it("adds a non-overlapping provider insight and caps the total", () => {
    const local = [ins({ kind: "overpromise", from: 0, to: 10 })];
    const provider = [
      ins({ kind: "unclear_ask", from: 50, to: 60 }),
      ins({ kind: "relationship_mismatch", from: 70, to: 80 }),
      ins({ kind: "decision_drift", from: 90, to: 100 }),
    ];
    const merged = mergeInsights(local, provider, 3);
    expect(merged).toHaveLength(3);
    expect(merged[0]!.kind).toBe("overpromise");
  });
});

describe("suppressDismissed", () => {
  it("removes insights whose kind was dismissed for this document", () => {
    const insights = validateInsights(
      [
        { kind: "relationship_mismatch", from: 0, to: 10, message: "too casual", rationale: "r" },
        { kind: "overpromise", from: 20, to: 30, message: "strong claim", rationale: "r" },
      ],
      DOC_LEN,
    );
    const kept = suppressDismissed(insights, new Set(["relationship_mismatch"]));
    expect(kept.map((i) => i.kind)).toEqual(["overpromise"]);
  });
});
