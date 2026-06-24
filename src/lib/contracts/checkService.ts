import type { ContextContract, ContractItem, ContinuityReceipt } from "@/types/continuity";
import { buildContextContract } from "@/lib/contracts/buildContextContract";
import { generateContinuityReceipt } from "@/lib/contracts/generateContinuityReceipt";

/**
 * The Continuity Check. Pure and deterministic, so it runs identically on the
 * client (instant, offline, honest) and on the server (where a provider can
 * enrich it). Given a piece of text and the contract to check it against, it
 * produces the always-five-section Continuity Receipt.
 */
export function runContinuityCheck(input: {
  text: string;
  contractItems?: ContractItem[];
  artifactId?: string;
}): { receipt: ContinuityReceipt; contract: ContextContract } {
  const contract = buildContextContract({
    name: "Continuity check",
    taskType: "check",
    items: input.contractItems ?? [],
  });
  const receipt = generateContinuityReceipt({
    text: input.text,
    contract,
    artifactId: input.artifactId ?? contract.id,
    contextUsed: contract.items,
  });
  return { receipt, contract };
}

const CARRY_FORWARD: ContractItem["kind"][] = [
  "decision",
  "constraint",
  "commitment",
  "tone_rule",
  "relationship_note",
];

function mergeBucket(existing: ContractItem[], extra: ContractItem[]): ContractItem[] {
  const seen = new Set(existing.map((i) => `${i.kind}:${i.statement.toLowerCase()}`));
  const merged = [...existing];
  for (const i of extra) {
    const key = `${i.kind}:${i.statement.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(i);
  }
  return merged;
}

/**
 * Fold provider-extracted items into a deterministic receipt, into the same
 * buckets the deterministic engine uses. Deduped; never replaces the baseline.
 */
export function mergeProviderItems(receipt: ContinuityReceipt, items: ContractItem[]): ContinuityReceipt {
  if (!items.length) return receipt;
  return {
    ...receipt,
    commitmentsCreated: mergeBucket(
      receipt.commitmentsCreated,
      items.filter((i) => i.kind === "commitment"),
    ),
    assumptionsMade: mergeBucket(
      receipt.assumptionsMade,
      items.filter((i) => i.kind === "approved_fact"),
    ),
    carryForwardCandidates: mergeBucket(
      receipt.carryForwardCandidates,
      items.filter((i) => CARRY_FORWARD.includes(i.kind)),
    ),
  };
}
