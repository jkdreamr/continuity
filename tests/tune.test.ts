import { describe, it, expect } from "vitest";
import { TuneCache, tuneCacheKey, fnv1a } from "@/lib/writing/tuneCache";
import { TUNE_SYSTEM, tuneVectorInstruction, buildTuneUser, contractSummary } from "@/lib/writing/tunePrompts";
import { makeContractItem } from "@/lib/contracts/extractContractItems";

describe("TuneCache — bounded LRU", () => {
  it("returns set values and reports membership", () => {
    const c = new TuneCache(3);
    c.set("a", "A");
    expect(c.get("a")).toBe("A");
    expect(c.has("a")).toBe(true);
    expect(c.get("missing")).toBeUndefined();
  });

  it("evicts the least-recently-used past capacity", () => {
    const c = new TuneCache(2);
    c.set("a", "A");
    c.set("b", "B");
    c.get("a"); // bump a to most-recent
    c.set("c", "C"); // should evict b
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
    expect(c.has("c")).toBe(true);
  });
});

describe("tuneCacheKey — any input change misses", () => {
  const base = {
    selectionHash: fnv1a("hello"),
    surroundingHash: fnv1a("ctx"),
    contractHash: fnv1a("c"),
    briefHash: fnv1a("b"),
    vectorKey: "67-33-50",
    modelId: "anthropic:claude",
  };
  it("differs when the vector changes", () => {
    expect(tuneCacheKey(base)).not.toBe(tuneCacheKey({ ...base, vectorKey: "50-33-50" }));
  });
  it("differs when the model changes", () => {
    expect(tuneCacheKey(base)).not.toBe(tuneCacheKey({ ...base, modelId: "openai:gpt" }));
  });
});

describe("tune prompts — Naturalness guardrails", () => {
  it("the system prompt preserves facts and forbids slang / detector claims", () => {
    expect(TUNE_SYSTEM).toMatch(/preserve/i);
    expect(TUNE_SYSTEM).toMatch(/commitments/i);
    expect(TUNE_SYSTEM).toMatch(/deadlines/i);
    expect(TUNE_SYSTEM).toMatch(/never .*slang|slang/i);
    expect(TUNE_SYSTEM).toMatch(/detection/i);
    // "human-written" only appears in its forbidding context.
    expect(TUNE_SYSTEM).toMatch(/do not assert.*human-written/i);
  });

  it("maps a vector to a plain target; 50 means no change", () => {
    expect(tuneVectorInstruction({ formality: 83, length: 33, naturalness: 67 })).toMatch(/formal/i);
    expect(tuneVectorInstruction({ formality: 83, length: 33, naturalness: 67 })).toMatch(/tighten/i);
    expect(tuneVectorInstruction({ formality: 50, length: 50, naturalness: 50 })).toMatch(/as-is/i);
  });

  it("builds a user prompt with the selection but not the whole document", () => {
    const user = buildTuneUser({
      selection: "I wanted to reach out and touch base.",
      before: "x".repeat(1000),
      after: "y".repeat(1000),
      vector: { formality: 50, length: 33, naturalness: 67 },
      contract: [makeContractItem("commitment", "Ship Friday.", "high")],
    });
    expect(user).toContain("Rewrite ONLY this selection");
    expect(user).toMatch(/Ship Friday/);
    // neighbor context is capped at ~300 chars each side, not the full 1000.
    expect(user).not.toContain("x".repeat(400));
  });

  it("summarizes a contract compactly", () => {
    const s = contractSummary([makeContractItem("constraint", "Do not overpromise.", "high")]);
    expect(s).toMatch(/overpromise/i);
  });
});
