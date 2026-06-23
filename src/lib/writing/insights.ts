import { z } from "zod";
import type { DocumentInsight, InsightKind } from "@/types/continuity";
import { newId } from "@/lib/id";

/**
 * Insight validation. Model output is untrusted: anything with a bad kind,
 * an invalid range, or an oversize replacement is dropped (fail closed). At
 * most three survive. No grammar squiggles — only the allowed semantic kinds.
 */

const InsightSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["ask_clarity", "tone_fit", "voice_drift", "redundancy", "unsupported_specificity"]),
  from: z.number().int().min(0),
  to: z.number().int().min(1),
  severity: z.enum(["low", "medium", "high"]).catch("low"),
  message: z.string().min(1).max(280),
  rationale: z.string().max(400).catch(""),
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
