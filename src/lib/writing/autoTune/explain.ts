import type { DocumentBrief } from "@/types/continuity";
import type { AutoTuneAxis, AutoTuneRecommendation, TuneVector } from "./types";
import { BASELINES, situationFromBrief } from "./rules";

/** Short adjective for the compact summary line ("Formal · Tighter · Natural"). */
export function axisWord(axis: AutoTuneAxis, v: number): string {
  if (axis === "formality") return v >= 60 ? "Formal" : v <= 40 ? "Casual" : "Balanced";
  if (axis === "length") return v <= 40 ? "Tighter" : v >= 60 ? "Fuller" : "Balanced";
  return v >= 60 ? "Natural" : v <= 40 ? "Polished" : "Balanced";
}

export function summaryChips(values: Partial<TuneVector>): string[] {
  const out: string[] = [];
  if (values.formality != null) out.push(axisWord("formality", values.formality));
  if (values.length != null) out.push(axisWord("length", values.length));
  if (values.naturalness != null) out.push(axisWord("naturalness", values.naturalness));
  return out;
}

export function situationLabel(brief?: DocumentBrief): string {
  return BASELINES[situationFromBrief(brief)].situation;
}

export function suggestedHeadline(brief?: DocumentBrief): string {
  const label = situationLabel(brief);
  if (label === "this") return "Suggested for this";
  return `Suggested for ${article(label)} ${label}`;
}

/** "Based on audience, the ask, and your approved voice", the signals used. */
export function basedOnLine(rec: AutoTuneRecommendation): string {
  const parts = rec.reasons.slice(0, 3).map((r) => r.toLowerCase());
  if (!parts.length) return "";
  return "Based on " + joinList(parts);
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
