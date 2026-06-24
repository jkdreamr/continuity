import type { ContractItem } from "@/types/continuity";

/**
 * Provider prompts for deeper extraction when a key is configured. The receipt
 * itself is always assembled deterministically; the provider only enriches the
 * set of detected contract items. Output is Zod-validated and fails closed.
 */

export const EXTRACT_SYSTEM = `You extract Context Contract items from a piece of text.
Return JSON only: {"items": [{"kind": string, "statement": string, "confidence": "high"|"medium"|"low"}]}.
Allowed kinds: approved_fact, decision, commitment, constraint, open_question, relationship_note, tone_rule.
Rules:
- Extract only genuine, concrete items actually present in the text. Do not invent.
- "commitment" = a promise the text makes (an action + a deadline or clear obligation).
- "constraint" = something that must not happen or must stay true.
- "decision" = a settled choice that should not be contradicted later.
- "open_question" = something unknown the output must not fabricate.
- Keep each statement short and self-contained. No commentary.`;

export function buildExtractUser(input: { text: string; objective?: string }): string {
  return [
    input.objective ? `Goal/context: ${input.objective}` : "",
    "Text to analyze (return JSON only):",
    `"""${input.text}"""`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** A compact, model-neutral rendering of the active contract for context. */
export function renderContractForPrompt(items: ContractItem[]): string {
  if (!items.length) return "Active contract: (none).";
  const by = (k: ContractItem["kind"]) =>
    items
      .filter((i) => i.kind === k)
      .map((i) => `- ${i.statement}`)
      .join("\n");
  return [
    "Active contract:",
    by("decision") && `Decisions:\n${by("decision")}`,
    by("constraint") && `Keep true / do not:\n${by("constraint")}`,
    by("commitment") && `Commitments:\n${by("commitment")}`,
    by("approved_fact") && `Approved facts:\n${by("approved_fact")}`,
    by("tone_rule") && `Tone:\n${by("tone_rule")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
