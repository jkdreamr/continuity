import { describe, it, expect } from "vitest";
import { detectContinuityInsights } from "@/lib/writing/continuityInsights";
import { extractContractItems } from "@/lib/contracts/extractContractItems";

describe("detectContinuityInsights — continuity categories, not grammar", () => {
  it("flags an accidental commitment with a usable range", () => {
    const text = "Thanks again for the chat. I'll send the deck by Friday.";
    const ins = detectContinuityInsights(text);
    const c = ins.find((i) => i.kind === "accidental_commitment");
    expect(c).toBeTruthy();
    expect(c!.from).toBeLessThan(c!.to);
    expect(text.slice(c!.from, c!.to).toLowerCase()).toContain("friday");
    expect(c!.safeAction).toBeTruthy();
  });

  it("flags a contradiction with an active contract", () => {
    const contract = extractContractItems("Do not imply that fundraising is open.");
    const ins = detectContinuityInsights("Our fundraising is officially open now.", { contract });
    expect(ins.some((i) => i.kind === "contradicts_contract")).toBe(true);
  });

  it("flags unsupported specificity (a number not in context)", () => {
    const ins = detectContinuityInsights("We now serve 50,000 customers across the country.");
    expect(ins.some((i) => i.kind === "unsupported_specificity")).toBe(true);
  });

  it("flags an overpromise", () => {
    const ins = detectContinuityInsights("This is a revolutionary, game-changing platform that guarantees results.");
    expect(ins.some((i) => i.kind === "overpromise")).toBe(true);
  });

  it("flags a buried ask in a longer message", () => {
    const text =
      "Hi Dana, hope you are well. We have been heads-down shipping the new onboarding and the launch is going smoothly so far. The team has been incredible and the metrics look encouraging across the board. Could you approve the budget by Thursday?";
    const ins = detectContinuityInsights(text);
    expect(ins.some((i) => i.kind === "unclear_ask")).toBe(true);
  });

  it("gives every insight a rationale and a valid range", () => {
    const text = "I'll ship it by Monday. We have 12,000 users. This is a guaranteed win.";
    for (const i of detectContinuityInsights(text)) {
      expect(i.rationale.length).toBeGreaterThan(0);
      expect(i.from).toBeGreaterThanOrEqual(0);
      expect(i.to).toBeGreaterThan(i.from);
    }
  });

  it("stays quiet on clean, ask-free prose", () => {
    const ins = detectContinuityInsights("It was good to reconnect. I appreciated your perspective on the market.");
    expect(ins).toHaveLength(0);
  });
});
