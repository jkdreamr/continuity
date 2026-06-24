import { describe, it, expect } from "vitest";
import { runContinuityCheck, mergeProviderItems } from "@/lib/contracts/checkService";
import { extractContractItems, makeContractItem } from "@/lib/contracts/extractContractItems";

describe("runContinuityCheck — paste text → receipt", () => {
  it("always returns the five receipt sections", () => {
    const { receipt } = runContinuityCheck({ text: "I'll send the deck by Friday. We serve 9,000 teams." });
    expect(receipt.commitmentsCreated.length).toBeGreaterThan(0);
    expect(receipt).toHaveProperty("contextUsed");
    expect(receipt).toHaveProperty("assumptionsMade");
    expect(receipt).toHaveProperty("contradictions");
    expect(receipt).toHaveProperty("carryForwardCandidates");
  });

  it("surfaces a contradiction against the supplied contract", () => {
    const contractItems = extractContractItems("Do not imply that fundraising is open.");
    const { receipt } = runContinuityCheck({
      text: "Quick note — our fundraising is open and going well.",
      contractItems,
    });
    expect(receipt.contradictions.length).toBeGreaterThan(0);
  });
});

describe("mergeProviderItems — enrichment never replaces the baseline", () => {
  it("adds a new provider commitment and dedupes an existing one", () => {
    const { receipt } = runContinuityCheck({ text: "I'll send the deck by Friday." });
    const baselineCount = receipt.commitmentsCreated.length;
    const dup = makeContractItem("commitment", "I'll send the deck by Friday.", "high");
    const fresh = makeContractItem("commitment", "We'll publish the changelog next week.", "medium");
    const merged = mergeProviderItems(receipt, [dup, fresh]);
    expect(merged.commitmentsCreated.length).toBe(baselineCount + 1);
    expect(merged.commitmentsCreated.some((i) => i.statement.includes("changelog"))).toBe(true);
  });

  it("is a no-op for an empty provider result", () => {
    const { receipt } = runContinuityCheck({ text: "Hello there." });
    expect(mergeProviderItems(receipt, [])).toBe(receipt);
  });
});
