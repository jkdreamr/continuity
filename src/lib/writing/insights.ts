import { z } from "zod";
import type { DocumentInsight, InsightKind } from "@/types/continuity";
import { newId } from "@/lib/id";

/**
 * Insight validation. Model output is untrusted: anything with a bad kind,
 * an invalid range, or an oversize replacement is dropped (fail closed). At
 * most three survive. No grammar squiggles, only the allowed semantic kinds.
 */

const InsightSchema = z.object({
  id: z.string().optional(),
  kind: z.enum([
    "unclear_ask",
    "accidental_commitment",
    "unsupported_specificity",
    "contradicts_contract",
    "missing_context",
    "relationship_mismatch",
    "decision_drift",
    "overpromise",
  ]),
  from: z.number().int().min(0),
  to: z.number().int().min(1),
  severity: z.enum(["low", "medium", "high"]).catch("low"),
  message: z.string().min(1).max(280),
  rationale: z.string().max(400).catch(""),
  safeAction: z.string().max(60).optional(),
  evidence: z.string().max(400).optional(),
  contractItemId: z.string().max(120).optional(),
  proposedText: z.string().max(600).optional(),
});

const MAX_INSIGHTS = 3;

export function validateInsights(raw: unknown, docTextLength: number): DocumentInsight[] {
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { insights?: unknown }).insights)
      ? (raw as { insights: unknown[] }).insights
      : null;
  if (!arr) return [];

  const out: DocumentInsight[] = [];
  for (const item of arr) {
    const parsed = InsightSchema.safeParse(item);
    if (!parsed.success) continue; // fail closed
    const v = parsed.data;
    if (v.from >= v.to) continue;
    if (v.to > docTextLength) continue;
    out.push({
      id: v.id || newId("insight"),
      kind: v.kind as InsightKind,
      from: v.from,
      to: v.to,
      severity: v.severity,
      message: v.message,
      rationale: v.rationale,
      safeAction: v.safeAction,
      evidence: v.evidence,
      contractItemId: v.contractItemId,
      proposedText: v.proposedText,
    });
    if (out.length >= MAX_INSIGHTS) break;
  }
  return out;
}

/** Drop insights whose pattern (kind) the user dismissed for this document. */
export function suppressDismissed(insights: DocumentInsight[], dismissedKinds: Set<string>): DocumentInsight[] {
  return insights.filter((i) => !dismissedKinds.has(i.kind));
}

/**
 * Merge deterministic (local, offline) insights with provider insights. Local
 * wins on overlap so the honest baseline is never overwritten; remaining
 * provider insights fill up to `cap`. Overlap = same kind covering the same span.
 */
export function mergeInsights(
  local: DocumentInsight[],
  provider: DocumentInsight[],
  cap = 3,
): DocumentInsight[] {
  const overlaps = (a: DocumentInsight, b: DocumentInsight) =>
    a.kind === b.kind && a.from < b.to && b.from < a.to;
  const out = [...local];
  for (const p of provider) {
    if (out.some((e) => overlaps(e, p))) continue;
    out.push(p);
  }
  return out.slice(0, cap);
}
