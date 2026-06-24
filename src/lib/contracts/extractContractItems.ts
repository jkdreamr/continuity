import type {
  ApplyPolicy,
  Confidence,
  ContractItem,
  ContractItemKind,
  EvidenceSource,
  Sensitivity,
} from "@/types/continuity";
import { newId, nowIso } from "@/lib/id";

/**
 * Deterministic Context Contract extraction. Runs offline (no provider) so Check
 * mode, receipts, and insights produce real, honest output without a key — a
 * provider only deepens it. Detection is pattern-based and conservative:
 * commitments, constraints, decisions, open questions, relationship/tone notes,
 * and concrete facts. Every item carries evidence (the matched text).
 */

const DEADLINE = /\bby\s+(mon|tue|tues|wed|thu|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next\s+week|end\s+of\s+(the\s+)?(day|week)|eod|eow|the\s+\d+)/i;
const COMMIT =
  /\b(i['’]?ll|we['’]?ll|i\s+will|we\s+will|i['’]?m\s+going\s+to|we['’]?re\s+going\s+to)\b|\b(will|going\s+to)\s+(send|ship|deliver|share|get|have|follow\s+up|circle\s+back|send\s+over|put\s+together)\b/i;
const CONSTRAINT =
  /\b(do\s*n['’]?t|do\s+not|never|must\s+not|cannot|can['’]?t|avoid|without\s+(touching|changing|altering)|please\s+(do\s+not|don['’]?t))\b/i;
const DECISION =
  /\b(we\s+decided|decided\s+to|the\s+plan\s+is|going\s+with|we['’]?re\s+going\s+with|chose\s+to|we\s+(will\s+not|won['’]?t)\s+(position|be|do|build|sell)|positioning\s+is|the\s+decision\s+is|we\s+agreed)\b/i;
const QUESTION = /\?\s*$|\b(tbd|to\s+be\s+(decided|determined)|not\s+sure|unclear|unknown|open\s+question)\b/i;
const TONE = /\b(tone|formal|informal|warm|direct|respectful|low-?hype|no\s+hype|concise|professional)\b/i;
const RELATION = /\b(to\s+my\s+(boss|manager|investor|customer|client)|for\s+(the\s+)?(board|investors|customers|leadership))\b/i;
const SENSITIVE =
  /(\bfundrais\w*|\braise\b|\bvaluation\b|\$\s?[\d,]+|\b\d+\s*(k|m|million|billion)\b|\bsalary\b|\bconfidential\b|\bacquisition\b|\bterm\s+sheet\b|\bcap\s+table\b|\bpassword\b|\bsecret\b|\bequity\b)/i;

export function makeContractItem(
  kind: ContractItemKind,
  statement: string,
  confidence: Confidence,
  opts?: { source?: EvidenceSource },
): ContractItem {
  const text = statement.trim();
  const sensitivity: Sensitivity = SENSITIVE.test(text) ? "sensitive" : "normal";
  const applyPolicy: ApplyPolicy =
    sensitivity === "sensitive"
      ? "manual_only"
      : kind === "open_question"
        ? "never_auto"
        : confidence === "low"
          ? "review"
          : kind === "commitment" || kind === "approved_fact"
            ? "review"
            : "auto";
  const ts = nowIso();
  return {
    id: newId("ci"),
    kind,
    statement: text,
    status: "proposed",
    scope: "task",
    evidence: [{ source: opts?.source ?? "pasted_source", excerpt: text }],
    confidence,
    sensitivity,
    applyPolicy,
    createdAt: ts,
    updatedAt: ts,
  };
}

function classify(s: string): { kind: ContractItemKind; confidence: Confidence } | null {
  if (QUESTION.test(s)) return { kind: "open_question", confidence: "low" };
  if (CONSTRAINT.test(s)) return { kind: "constraint", confidence: "high" };
  if (DECISION.test(s)) return { kind: "decision", confidence: "medium" };
  if (COMMIT.test(s)) return { kind: "commitment", confidence: DEADLINE.test(s) ? "high" : "medium" };
  if (RELATION.test(s)) return { kind: "relationship_note", confidence: "medium" };
  if (TONE.test(s) && /\b(keep|make|stay|be|tone|sound)\b/i.test(s)) return { kind: "tone_rule", confidence: "medium" };
  if (/\d/.test(s) && s.split(/\s+/).length >= 3) return { kind: "approved_fact", confidence: "medium" };
  return null;
}

export function extractContractItems(text: string, opts?: { source?: EvidenceSource }): ContractItem[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  const items: ContractItem[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const c = classify(s);
    if (!c) continue;
    const key = `${c.kind}:${s.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(makeContractItem(c.kind, s, c.confidence, opts));
  }
  return items;
}

/** True only when an item is safe to apply automatically without user review. */
export function autoSavable(item: ContractItem): boolean {
  return item.confidence !== "low" && item.sensitivity === "normal" && item.applyPolicy === "auto";
}
