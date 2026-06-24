import type { ContractItem, ReceiptConflict } from "@/types/continuity";
import { newId } from "@/lib/id";

/**
 * Deterministic contradiction detection: when the output affirms something a
 * constraint/decision prohibits. Conservative — it matches the content words of
 * a prohibition against the text, so it flags real conflicts (e.g. "do not imply
 * fundraising is open" vs "fundraising is now open") without grammar noise.
 */

const PROHIBITION =
  /\b(?:do\s*n['’]?t|do\s+not|don['’]?t|never|must\s+not|cannot|can['’]?t|avoid|will\s+not|won['’]?t|please\s+(?:do\s+not|don['’]?t))\b\s*(?:imply(?:\s+that)?|mention|say|claim|share|state|suggest|position\s+(?:us\s+)?as|be|do|build|sell|use|that)?\s*(.+?)[.?!]*$/i;

const STOP = new Set([
  "that","this","with","from","into","your","their","about","will","would","should",
  "could","have","been","being","they","them","there","then","than","what","when",
  "which","while","also","just","only","very","much","more","most","some","such",
  "each","every","does","done","make","made","like","want","need","because","officially","now",
]);

function contentWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

export function detectContradictions(text: string, items: ContractItem[]): ReceiptConflict[] {
  const lower = text.toLowerCase();
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim());
  const conflicts: ReceiptConflict[] = [];

  for (const item of items) {
    if (item.kind !== "constraint" && item.kind !== "decision") continue;
    const m = item.statement.match(PROHIBITION);
    if (!m || !m[1]) continue;
    const words = contentWords(m[1]);
    if (words.length === 0) continue;
    if (!words.every((w) => lower.includes(w))) continue;

    const offending = sentences.find((s) => {
      const sl = s.toLowerCase();
      return words.every((w) => sl.includes(w));
    });

    conflicts.push({
      id: newId("conflict"),
      statement: (offending ?? text).slice(0, 200),
      conflictsWith: item.id,
      severity: item.kind === "constraint" ? "high" : "medium",
      rationale: `The output affirms "${m[1].trim()}", which the contract asks to avoid.`,
      evidence: [{ source: "document", excerpt: (offending ?? text).slice(0, 200) }],
    });
  }
  return conflicts;
}
