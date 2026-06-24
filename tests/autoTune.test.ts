import { describe, it, expect } from "vitest";
import type { DocumentBrief } from "@/types/continuity";
import { recommendWriting } from "@/lib/writing/autoTune/recommend";
import { detectBuildApproach } from "@/lib/writing/autoTune/buildApproach";
import { quickActionsFor } from "@/lib/writing/autoTune/quickActions";
import { quantize, quantizeVector, isNeutralVector, vectorKey } from "@/lib/writing/autoTune/normalize";
import { summaryChips, suggestedHeadline } from "@/lib/writing/autoTune/explain";
import { makeContractItem } from "@/lib/contracts/extractContractItems";

function brief(partial: Partial<DocumentBrief>): DocumentBrief {
  return { kind: "other", facts: [], unknowns: [], confidence: "high", source: "user_stated", ...partial };
}

describe("recommendWriting — baseline profiles", () => {
  const cases: [Partial<DocumentBrief>, [number, number, number]][] = [
    [{ kind: "manager_email", relationship: "manager" }, [68, 34, 58]],
    [{ kind: "investor_follow_up", relationship: "investor" }, [60, 38, 56]],
    [{ relationship: "customer" }, [66, 46, 55]],
    [{ relationship: "peer" }, [36, 46, 68]],
    [{ relationship: "public" }, [28, 34, 70]],
    [{ kind: "memo" }, [58, 63, 48]],
  ];
  it.each(cases)("maps brief %o to its exact baseline", (b, [f, l, n]) => {
    const r = recommendWriting({ brief: brief(b) });
    expect([r.values.formality, r.values.length, r.values.naturalness]).toEqual([f, l, n]);
    expect(r.source).toBe("brief");
  });

  it("falls back to neutral 50/50/50 at low confidence with no signals", () => {
    const r = recommendWriting({});
    expect(r.values).toEqual({ formality: 50, length: 50, naturalness: 50 });
    expect(r.confidence).toBe("low");
    expect(r.source).toBe("neutral");
  });
});

describe("recommendWriting — precedence", () => {
  it("lets an explicit instruction win over the brief", () => {
    const r = recommendWriting({ instruction: "keep it casual and short", brief: brief({ relationship: "manager" }) });
    expect(r.source).toBe("explicit");
    expect(r.confidence).toBe("high");
    expect(r.values.formality!).toBeLessThan(40); // casual overrode the formal manager baseline
    expect(r.values.length!).toBeLessThan(40); // short
  });

  it("lets a contract outrank the brief/selection and protect commitments", () => {
    const contractItems = [makeContractItem("commitment", "Ship the prototype by Friday.", "high")];
    const r = recommendWriting({ brief: brief({ relationship: "peer" }), contractItems });
    expect(r.source).toBe("contract");
    expect(r.values.length!).toBeLessThanOrEqual(40); // concise to protect the commitment
    expect(r.values.naturalness!).toBeLessThanOrEqual(56); // measured, not loose
    expect(r.reasons.join(" ")).toMatch(/commitment/i);
  });

  it("nudges from selection analysis when it is generic and long", () => {
    const selection =
      "I hope this email finds you well. I wanted to reach out to touch base and circle back on the thing we discussed, and just wanted to follow up moving forward as you know.";
    const r = recommendWriting({ selection });
    expect(r.values.length!).toBeLessThan(50);
    expect(r.values.naturalness!).toBeGreaterThan(50);
  });
});

describe("recommendWriting — safety", () => {
  it("defaults userOverride to false and never persists", () => {
    const r = recommendWriting({ brief: brief({ relationship: "manager" }) });
    expect(r.userOverride).toBe(false);
    // pure: calling twice yields an equal recommendation (no hidden state)
    expect(recommendWriting({ brief: brief({ relationship: "manager" }) }).values).toEqual(r.values);
  });

  it("returns plain, safe reasons (no AI-detector / human-written claims)", () => {
    const r = recommendWriting({ instruction: "make it more natural", brief: brief({ relationship: "peer" }) });
    expect(r.reasons.length).toBeGreaterThan(0);
    for (const reason of r.reasons) {
      expect(reason.length).toBeGreaterThan(0);
      expect(reason).not.toMatch(/detector|human-written|evade|authentic/i);
    }
  });
});

describe("explain helpers", () => {
  it("summarizes a vector into endpoint words", () => {
    expect(summaryChips({ formality: 68, length: 34, naturalness: 70 })).toEqual(["Formal", "Tighter", "Natural"]);
  });
  it("headlines the situation", () => {
    expect(suggestedHeadline(brief({ relationship: "manager", kind: "manager_email" }))).toMatch(/manager email/i);
  });
});

describe("normalize — seven stops", () => {
  it("snaps to the nearest of 0/17/33/50/67/83/100", () => {
    expect(quantize(0)).toBe(0);
    expect(quantize(60)).toBe(67);
    expect(quantize(34)).toBe(33);
    expect(quantize(100)).toBe(100);
  });
  it("treats all-midpoint as neutral and keys quantized vectors", () => {
    expect(isNeutralVector({ formality: 50, length: 50, naturalness: 50 })).toBe(true);
    expect(isNeutralVector({ formality: 68, length: 34, naturalness: 58 })).toBe(false);
    expect(vectorKey({ formality: 68, length: 34, naturalness: 58 })).toBe(
      `${quantizeVector({ formality: 68, length: 34, naturalness: 58 }).formality}-33-50`,
    );
  });
});

describe("quickActionsFor — contextual, never on a blank document", () => {
  it("returns nothing for an empty selection", () => {
    expect(quickActionsFor({ selection: "" })).toEqual([]);
  });
  it("offers Tighten this for a long selection", () => {
    const long = "word ".repeat(50);
    expect(quickActionsFor({ selection: long }).some((a) => a.id === "tighten")).toBe(true);
  });
  it("offers Make more natural for generic/hype phrasing", () => {
    const generic = "I hope this email finds you well. We are reaching out to circle back.";
    expect(quickActionsFor({ selection: generic }).some((a) => a.id === "natural")).toBe(true);
  });
  it("offers Make more formal for an informal selection in a manager context", () => {
    const actions = quickActionsFor({
      selection: "hey, gonna send u the thing later lol",
      brief: brief({ relationship: "manager" }),
    });
    expect(actions.some((a) => a.id === "formal")).toBe(true);
  });
  it("caps at three actions", () => {
    const actions = quickActionsFor({ selection: "I hope this finds you well. " + "word ".repeat(50) });
    expect(actions.length).toBeLessThanOrEqual(3);
  });
});

describe("detectBuildApproach", () => {
  it("routes schema/auth/routing to safety review (highest risk)", () => {
    expect(detectBuildApproach({ request: "Update the database schema and the auth routing for users" }).approach).toBe("safety-review");
  });
  it("routes a bug/error to debug-verify", () => {
    expect(detectBuildApproach({ request: "Fix the bug where export crashes with an exception" }).approach).toBe("debug-verify");
  });
  it("routes a visual request to design-refinement", () => {
    expect(detectBuildApproach({ request: "Redesign the landing page hero with a new color palette" }).approach).toBe("design-refinement");
  });
  it("routes a multi-file/unknown scope to explore-plan", () => {
    expect(detectBuildApproach({ request: "Add a new feature that spans several modules in the codebase" }).approach).toBe("explore-plan");
  });
  it("routes a small precise change to minimal-diff", () => {
    expect(detectBuildApproach({ request: "Change the copyright year in the footer text" }).approach).toBe("minimal-diff");
  });
  it("carries a label, a reason, and brief additions", () => {
    const r = detectBuildApproach({ request: "Redesign the landing page" });
    expect(r.label).toBe("Design refinement");
    expect(r.reason.length).toBeGreaterThan(0);
    expect(r.briefAdditions.length).toBeGreaterThan(0);
  });
});
