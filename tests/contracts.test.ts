import { describe, it, expect } from "vitest";
import { extractContractItems, autoSavable } from "@/lib/contracts/extractContractItems";
import { buildContextContract } from "@/lib/contracts/buildContextContract";
import { detectContradictions } from "@/lib/contracts/detectContradictions";
import { generateContinuityReceipt, receiptToMarkdown } from "@/lib/contracts/generateContinuityReceipt";
import { validateExtraction, ContractItemSchema } from "@/lib/contracts/contractSchemas";

describe("extractContractItems", () => {
  it("detects a commitment with a date", () => {
    const items = extractContractItems("Thanks again — I'll send you the prototype notes by Friday.");
    const c = items.find((i) => i.kind === "commitment");
    expect(c).toBeTruthy();
    expect(c!.statement.toLowerCase()).toContain("friday");
  });

  it("detects a constraint", () => {
    const items = extractContractItems("Please don't imply that the round is closed.");
    expect(items.some((i) => i.kind === "constraint")).toBe(true);
  });

  it("detects an open question", () => {
    const items = extractContractItems("Great chat. The exact next meeting date is still TBD.");
    expect(items.some((i) => i.kind === "open_question")).toBe(true);
  });

  it("gives every item at least one piece of evidence", () => {
    const items = extractContractItems("We decided to position as a continuity ledger. I'll follow up by Monday. Do not mention pricing.");
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) expect(i.evidence.length).toBeGreaterThan(0);
  });

  it("marks sensitive items (fundraising, money) as manual-only", () => {
    const items = extractContractItems("Do not imply that fundraising is open or share the $4M valuation.");
    const sensitive = items.filter((i) => i.sensitivity === "sensitive");
    expect(sensitive.length).toBeGreaterThan(0);
    for (const i of sensitive) expect(["manual_only", "review"]).toContain(i.applyPolicy);
  });

  it("never auto-saves low-confidence items", () => {
    const items = extractContractItems("Maybe we should consider a different approach? TBD.");
    for (const i of items.filter((x) => x.confidence === "low")) {
      expect(i.applyPolicy).not.toBe("auto");
      expect(autoSavable(i)).toBe(false);
    }
  });
});

describe("detectContradictions", () => {
  it("flags a high-severity conflict with a prohibition", () => {
    const contract = buildContextContract({
      name: "Continuity",
      taskType: "writing",
      items: extractContractItems("Do not imply that fundraising is open."),
    });
    const conflicts = detectContradictions(
      "Exciting update — our fundraising is now officially open!",
      contract.items,
    );
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]!.severity).toBe("high");
    expect(conflicts[0]!.conflictsWith.length).toBeGreaterThan(0);
  });

  it("returns nothing when there is no conflict", () => {
    const items = extractContractItems("Keep the tone warm and direct.");
    expect(detectContradictions("Looking forward to our next chat.", items)).toEqual([]);
  });
});

describe("generateContinuityReceipt", () => {
  const contract = buildContextContract({
    name: "Reid follow-up",
    taskType: "writing",
    objective: "Warm investor follow-up",
    items: extractContractItems("Do not imply that fundraising is open."),
  });
  const text = "Hi Reid — fundraising is open and we'll ship the prototype by Friday. We have 12,000 users.";

  it("always returns all five sections", () => {
    const r = generateContinuityReceipt({ text, contract, artifactId: "a1" });
    expect(Array.isArray(r.contextUsed)).toBe(true);
    expect(Array.isArray(r.commitmentsCreated)).toBe(true);
    expect(Array.isArray(r.assumptionsMade)).toBe(true);
    expect(Array.isArray(r.contradictions)).toBe(true);
    expect(Array.isArray(r.carryForwardCandidates)).toBe(true);
  });

  it("separates commitments from assumptions", () => {
    const r = generateContinuityReceipt({ text, contract, artifactId: "a1" });
    expect(r.commitmentsCreated.some((c) => c.kind === "commitment")).toBe(true);
    expect(r.commitmentsCreated.every((c) => c.kind === "commitment")).toBe(true);
    expect(r.assumptionsMade.every((a) => a.kind !== "commitment")).toBe(true);
  });

  it("surfaces the contradiction with the contract", () => {
    const r = generateContinuityReceipt({ text, contract, artifactId: "a1" });
    expect(r.contradictions.length).toBeGreaterThan(0);
  });

  it("only proposes carry-forward candidates (requires user action)", () => {
    const r = generateContinuityReceipt({ text, contract, artifactId: "a1" });
    for (const c of r.carryForwardCandidates) expect(c.status).toBe("proposed");
  });

  it("renders a copyable/exportable receipt with five headings", () => {
    const md = receiptToMarkdown(generateContinuityReceipt({ text, contract, artifactId: "a1" }));
    expect(md).toMatch(/context used/i);
    expect(md).toMatch(/commitments created/i);
    expect(md).toMatch(/assumptions made/i);
    expect(md).toMatch(/contradiction/i);
    expect(md).toMatch(/carry/i);
  });
});

describe("contractSchemas", () => {
  it("validates a well-formed item and rejects garbage (fails closed)", () => {
    const good = extractContractItems("I'll send notes by Friday.")[0]!;
    expect(ContractItemSchema.safeParse(good).success).toBe(true);
    expect(validateExtraction(null)).toEqual([]);
    expect(validateExtraction({ items: [{ kind: "not_a_kind", statement: "x" }] })).toEqual([]);
  });
});
