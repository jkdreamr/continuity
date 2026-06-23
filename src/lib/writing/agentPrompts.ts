import type { DocumentBrief } from "@/types/continuity";

/**
 * System instructions for the writing agent (from the V7 thesis §12). Kept small,
 * structured, and bounded. The provider must return validated structured data or
 * an honest null — never a fabricated draft.
 */

export const COMPLETION_SYSTEM = `You are a conservative prose completion engine. Continue only the user's current thought.
Return JSON: {"completion": string | null}. Rules:
- Offer at most one short clause or sentence; max 90 characters.
- Never introduce names, dates, numbers, commitments, events, or facts not present in the supplied text/context.
- Preserve the user's voice and current document brief.
- Return null when the continuation would be speculative, repetitive, or intrusive.
- Do not explain your choice.`;

export const INSIGHTS_SYSTEM = `Review only for high-value contextual issues. Return JSON: {"insights": Insight[]} with at most three.
Allowed kinds: ask_clarity, tone_fit, voice_drift, redundancy, unsupported_specificity.
Each insight: {kind, from, to, severity, message, rationale, proposedText?} where from/to are character offsets into the provided plain text.
Do not flag basic spelling/grammar unless it changes the intended meaning.
Every insight must cite an exact range and explain why it matters for the active brief. Do not invent facts or imitate named people.`;

export const TRANSFORM_SYSTEM = `Rewrite only the selected passage. Preserve its factual meaning unless the instruction explicitly requests reframing.
Honor the full instruction and the active document brief. Do not alter surrounding document text.
Return only the replacement text. No explanations, headings, or quotation marks.`;

function briefLine(brief?: DocumentBrief): string {
  if (!brief) return "Document brief: (none yet).";
  const bits = [
    `kind: ${brief.kind}`,
    brief.relationship && `relationship: ${brief.relationship}`,
    brief.tone?.length && `tone: ${brief.tone.join(", ")}`,
    brief.goal && `goal: ${brief.goal}`,
  ].filter(Boolean);
  return `Document brief — ${bits.join("; ")}.`;
}

export function buildCompletionUser(input: {
  before: string;
  after: string;
  brief?: DocumentBrief;
  memory?: string[];
}): string {
  return [
    briefLine(input.brief),
    input.memory?.length ? `Approved context: ${input.memory.join(" | ")}` : "",
    "Continue the text at <CURSOR>. Return JSON only.",
    `"""${input.before}<CURSOR>${input.after}"""`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildInsightsUser(input: { text: string; brief?: DocumentBrief }): string {
  return [briefLine(input.brief), "Document plain text (offsets are 0-based into this string):", `"""${input.text}"""`].join(
    "\n",
  );
}

export function buildTransformUser(input: {
  selection: string;
  before: string;
  after: string;
  instruction: string;
  brief?: DocumentBrief;
}): string {
  return [
    briefLine(input.brief),
    `Instruction: ${input.instruction}`,
    `Text just before the selection: """${input.before.slice(-200)}"""`,
    `Text just after the selection: """${input.after.slice(0, 200)}"""`,
    `Rewrite ONLY this selected passage:`,
    `"""${input.selection}"""`,
  ].join("\n");
}
