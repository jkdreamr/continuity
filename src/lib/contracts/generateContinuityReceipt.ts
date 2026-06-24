import type { ContextContract, ContractItem, ContinuityReceipt } from "@/types/continuity";
import { newId, nowIso } from "@/lib/id";
import { extractContractItems } from "@/lib/contracts/extractContractItems";
import { detectContradictions } from "@/lib/contracts/detectContradictions";

const CARRY_FORWARD: ContractItem["kind"][] = [
  "decision",
  "constraint",
  "commitment",
  "tone_rule",
  "relationship_note",
];

/**
 * The deterministic Continuity Receipt. Always five sections. Commitments are
 * the promises the artifact creates; assumptions are concrete claims asserted
 * without contract backing; contradictions come from the active contract;
 * carry-forward items are durable truths worth saving (left as proposals).
 */
export function generateContinuityReceipt(input: {
  text: string;
  contract: ContextContract;
  artifactId: string;
  /** Context that actually applied (active contract items, baseline). */
  contextUsed?: ContractItem[];
}): ContinuityReceipt {
  const extracted = extractContractItems(input.text, { source: "document" });

  const commitmentsCreated = extracted.filter((i) => i.kind === "commitment");
  const assumptionsMade = extracted.filter((i) => i.kind === "approved_fact");
  const contradictions = detectContradictions(input.text, input.contract.items);
  const carryForwardCandidates = extracted.filter((i) => CARRY_FORWARD.includes(i.kind));
  const contextUsed =
    input.contextUsed ?? input.contract.items.filter((i) => i.status === "active");

  return {
    id: newId("rcpt"),
    artifactId: input.artifactId,
    contractId: input.contract.id,
    contextUsed,
    commitmentsCreated,
    assumptionsMade,
    contradictions,
    carryForwardCandidates,
    createdAt: nowIso(),
  };
}

function lines(items: ContractItem[]): string {
  if (!items.length) return "- (none)";
  return items.map((i) => `- ${i.statement}  _(${i.kind.replace(/_/g, " ")} · ${i.confidence})_`).join("\n");
}

/** Copyable / exportable receipt. Always the five headings. */
export function receiptToMarkdown(r: ContinuityReceipt, title = "Continuity receipt"): string {
  const conflictLines = r.contradictions.length
    ? r.contradictions.map((c) => `- ${c.statement}, conflict (${c.severity}): ${c.rationale}`).join("\n")
    : "- (none)";
  return [
    `# ${title}`,
    "",
    "## Context used",
    lines(r.contextUsed),
    "",
    "## Commitments created",
    lines(r.commitmentsCreated),
    "",
    "## Assumptions made",
    lines(r.assumptionsMade),
    "",
    "## Potential contradictions",
    conflictLines,
    "",
    "## What should carry forward",
    lines(r.carryForwardCandidates),
  ].join("\n");
}
