import type { ContractItem } from "@/types/continuity";

/**
 * Meaningful-only Tune receipt (V10). After a control settles, summarize what was
 * KEPT (a commitment/decision/constraint preserved) and what CHANGED (an
 * overpromise or generic framing removed, a tightening). Returns null when there
 * is nothing meaningful to say, so we never show an empty compliance ritual.
 */
export type TuneReceipt = { kept: string[]; changed: string[] };

const HYPE =
  /\b(revolutionary|game-?chang\w*|seamless\w*|cutting-?edge|world-?class|best-in-class|unprecedented|effortless\w*|supercharge\w*|unlock|10x|guarantee\w*)\b/i;
const GENERIC =
  /\b(i hope this (email |message )?finds you well|i wanted to reach out|i am reaching out|just wanted to|circle back|touch base|leverage|synergy|moving forward|as you know|needless to say)\b/i;
const STOP = new Set(["this", "that", "with", "from", "have", "will", "your", "their", "about", "they", "them", "then", "than", "into", "been", "were", "what", "when", "ship"]);

function contentWords(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []).filter((w) => !STOP.has(w));
}

/** True when most of the statement's content words survive in the final text. */
function preserved(statement: string, final: string): boolean {
  const words = contentWords(statement);
  if (words.length < 2) return false;
  const lower = final.toLowerCase();
  const hits = words.filter((w) => lower.includes(w)).length;
  return hits >= Math.ceil(words.length * 0.6);
}

function shorten(s: string, n = 56): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

export function tuneReceipt(input: {
  original: string;
  final: string;
  contractItems?: ContractItem[];
}): TuneReceipt | null {
  const { original, final } = input;
  if (!final || final === original) return null;

  const kept: string[] = [];
  for (const item of input.contractItems ?? []) {
    if (item.status === "rejected") continue;
    if (item.kind !== "commitment" && item.kind !== "decision" && item.kind !== "constraint") continue;
    if (preserved(item.statement, original) && preserved(item.statement, final)) {
      kept.push(shorten(item.statement));
    }
  }

  const changed: string[] = [];
  const overpromiseRemoved = HYPE.test(original) && !HYPE.test(final);
  const genericRemoved = GENERIC.test(original) && !GENERIC.test(final);
  if (overpromiseRemoved) changed.push("removed a potential overpromise");
  if (genericRemoved) changed.push("cut generic framing");
  if (final.length < original.length * 0.9) changed.push("tightened the wording");

  const meaningful = kept.length > 0 || overpromiseRemoved || genericRemoved;
  if (!meaningful) return null;

  return { kept: kept.slice(0, 3), changed: changed.slice(0, 3) };
}
