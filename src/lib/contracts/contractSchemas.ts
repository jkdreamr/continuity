import { z } from "zod";
import type { ContractItem } from "@/types/continuity";
import { makeContractItem } from "@/lib/contracts/extractContractItems";

/** Runtime schemas for contracts/receipts, used by persistence + provider validation. */

const KIND = z.enum([
  "approved_fact",
  "decision",
  "commitment",
  "constraint",
  "open_question",
  "relationship_note",
  "tone_rule",
]);

export const EvidenceRefSchema = z.object({
  source: z.enum(["user_stated", "pasted_source", "imported", "approved_draft", "prior_receipt", "document"]),
  excerpt: z.string(),
});

export const ContractItemSchema = z.object({
  id: z.string().min(1),
  kind: KIND,
  statement: z.string().min(1),
  status: z.enum(["proposed", "active", "rejected", "expired"]),
  scope: z.enum(["task", "document", "project", "person", "global"]),
  evidence: z.array(EvidenceRefSchema),
  confidence: z.enum(["high", "medium", "low"]),
  sensitivity: z.enum(["normal", "private", "sensitive"]),
  applyPolicy: z.enum(["auto", "review", "manual_only", "never_auto"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ContextContractSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  taskType: z.enum(["writing", "build", "check"]),
  objective: z.string().optional(),
  items: z.array(ContractItemSchema),
  sourceArtifactIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ReceiptConflictSchema = z.object({
  id: z.string().min(1),
  statement: z.string(),
  conflictsWith: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
  evidence: z.array(EvidenceRefSchema),
});

export const ContinuityReceiptSchema = z.object({
  id: z.string().min(1),
  artifactId: z.string(),
  contractId: z.string(),
  contextUsed: z.array(ContractItemSchema),
  commitmentsCreated: z.array(ContractItemSchema),
  assumptionsMade: z.array(ContractItemSchema),
  contradictions: z.array(ReceiptConflictSchema),
  carryForwardCandidates: z.array(ContractItemSchema),
  createdAt: z.string(),
});

/** Loose shape a provider may return; coerced into full ContractItems. */
const RawExtractedSchema = z.object({
  kind: KIND,
  statement: z.string().min(1).max(400),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

/** Validate provider extraction output. Fails closed: invalid items are dropped. */
export function validateExtraction(raw: unknown): ContractItem[] {
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : null;
  if (!arr) return [];
  const out: ContractItem[] = [];
  for (const item of arr) {
    const parsed = RawExtractedSchema.safeParse(item);
    if (!parsed.success) continue;
    out.push(makeContractItem(parsed.data.kind, parsed.data.statement, parsed.data.confidence ?? "medium"));
  }
  return out;
}
