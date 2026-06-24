import type { ContractItem, DocumentBrief } from "@/types/continuity";
import type { TuneVector } from "@/lib/writing/autoTune/types";
import { quantizeVector } from "@/lib/writing/autoTune/normalize";

/**
 * Tune rewrite prompts (V10, Appendix A behavior). The model rewrites ONLY the
 * selected passage toward the three-control vector while preserving meaning. We
 * send a compact context, selection + a little neighbor text + a contract
 * summary + brief, never the full document. Output is plain text.
 */

export const TUNE_SYSTEM = `You rewrite ONLY the selected passage of a piece of writing, adjusting three controls while preserving its meaning. Return only the rewritten selection as plain text. No quotes, preamble, or commentary.

Always preserve: facts, named entities, dates, deadlines, commitments, citations, the core ask, and relationship context. Never invent examples, metrics, claims, relationship history, or commitments. Never add typos, grammatical errors, slang, forced contractions, fake emotion, or fabricated opinions. Do not weaken professional fit. Do not claim or attempt to evade AI detection, and do not assert the text is "human-written."

The three controls (0 to 100; 50 means leave that dimension as-is):
- Formality. Higher: precise professional diction, respectful direct asks, appropriate greeting/closing if present, less slang and shorthand. Lower: remove stiffness and ceremony while staying specific and respectful; do not force casualness the audience does not fit.
- Length. Lower (tighter): remove redundancy, throat-clearing, generic framing, and unnecessary recap before ever removing facts or asks. Higher (more complete): add only useful explanation supported by the context.
- Naturalness. Higher (more natural): remove generic openings, stock transitions, empty intensifiers, marketing language, recap for its own sake, and overly balanced symmetry; prefer concrete nouns and active verbs; keep wording the writer already supplied where it carries voice; keep audience-appropriate formality. Lower: more polished and refined. Natural never means sloppy, casual, slangy, or fake.`;

/** Plain-language target derived from the quantized vector (50 = no change). */
export function tuneVectorInstruction(v: TuneVector): string {
  const q = quantizeVector(v);
  const parts: string[] = [];
  if (q.formality !== 50) parts.push(`make it ${q.formality > 50 ? "more formal" : "more casual"}`);
  if (q.length !== 50) parts.push(q.length < 50 ? "tighten it" : "make it more complete");
  if (q.naturalness !== 50) parts.push(q.naturalness > 50 ? "make it more natural and less formulaic" : "keep it polished");
  if (!parts.length) return "Keep the passage essentially as-is, only cleaning obvious errors.";
  return parts.join("; ") + ".";
}

/** Compact, model-neutral contract summary (the constraints the rewrite must respect). */
export function contractSummary(items: ContractItem[] | undefined, max = 6): string {
  if (!items?.length) return "";
  const keep = items.filter((i) => i.status !== "rejected").slice(0, max);
  if (!keep.length) return "";
  return keep.map((i) => `- ${i.kind.replace(/_/g, " ")}: ${i.statement}`).join("\n");
}

function briefLine(brief?: DocumentBrief): string {
  if (!brief) return "";
  const bits = [
    `kind ${brief.kind}`,
    brief.relationship && `to a ${brief.relationship}`,
    brief.tone?.length && `tone ${brief.tone.join(", ")}`,
  ].filter(Boolean);
  return bits.length ? `Document: ${bits.join("; ")}.` : "";
}

export function buildTuneUser(input: {
  selection: string;
  before?: string;
  after?: string;
  vector: TuneVector;
  brief?: DocumentBrief;
  contract?: ContractItem[];
  voiceSummary?: string;
}): string {
  const summary = contractSummary(input.contract);
  return [
    `Target: ${tuneVectorInstruction(input.vector)}`,
    briefLine(input.brief),
    summary ? `Respect this contract (do not contradict or drop these):\n${summary}` : "",
    input.voiceSummary ? `Approved voice: ${input.voiceSummary}` : "",
    input.before ? `Context just before (do NOT rewrite): """${input.before.slice(-300)}"""` : "",
    input.after ? `Context just after (do NOT rewrite): """${input.after.slice(0, 300)}"""` : "",
    `Rewrite ONLY this selection:\n"""${input.selection}"""`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
