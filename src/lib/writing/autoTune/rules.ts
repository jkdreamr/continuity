import type { DocumentBrief } from "@/types/continuity";
import type { TuneVector } from "./types";

/**
 * Deterministic baseline rules. The exact V10 profiles, plus light keyword
 * detection for explicit instructions and selection analysis. No LLM.
 */

export type WritingSituation =
  | "manager_request"
  | "investor_followup"
  | "customer_note"
  | "peer_message"
  | "public_post"
  | "product_memo"
  | "unknown";

export const BASELINES: Record<WritingSituation, { vector: TuneVector; situation: string; blurb: string }> = {
  manager_request: { vector: { formality: 68, length: 34, naturalness: 58 }, situation: "manager email", blurb: "Professional relationship; lead with a concise, respectful ask." },
  investor_followup: { vector: { formality: 60, length: 38, naturalness: 56 }, situation: "investor follow-up", blurb: "Specific and low-hype; preserve commitments and the next step." },
  customer_note: { vector: { formality: 66, length: 46, naturalness: 55 }, situation: "customer note", blurb: "External audience; clear context without unnecessary recap." },
  peer_message: { vector: { formality: 36, length: 46, naturalness: 68 }, situation: "peer message", blurb: "Conversational but still specific and actionable." },
  public_post: { vector: { formality: 28, length: 34, naturalness: 70 }, situation: "public post", blurb: "Direct, distinct rhythm; avoid promotional filler." },
  product_memo: { vector: { formality: 58, length: 63, naturalness: 48 }, situation: "product memo", blurb: "Keep detail and decisions explicit; don't compress away rationale." },
  unknown: { vector: { formality: 50, length: 50, naturalness: 50 }, situation: "this", blurb: "No assumed style yet." },
};

/** Map a Document Brief (audience/relationship/kind) to a writing situation. */
export function situationFromBrief(brief?: DocumentBrief): WritingSituation {
  if (!brief) return "unknown";
  const rel = brief.relationship;
  const kind = brief.kind;
  if (rel === "manager" || kind === "manager_email") return "manager_request";
  if (rel === "investor" || kind === "investor_follow_up") return "investor_followup";
  if (rel === "customer") return "customer_note";
  if (rel === "peer") return "peer_message";
  if (rel === "public" || kind === "post") return "public_post";
  if (kind === "memo") return "product_memo";
  return "unknown";
}

/** Explicit-instruction keyword signals. Highest priority when present. */
export type ExplicitSignal = { axis: "formality" | "length" | "naturalness"; value: number; reason: string };

export function explicitSignals(text: string | undefined): ExplicitSignal[] {
  if (!text) return [];
  const t = text.toLowerCase();
  const out: ExplicitSignal[] = [];
  if (/\b(formal|professor|professional|boss|manager|exec|board|investor|respectful)\b/.test(t))
    out.push({ axis: "formality", value: 72, reason: "you asked for a more formal tone" });
  if (/\b(casual|informal|relaxed|friendly|chill|conversational)\b/.test(t))
    out.push({ axis: "formality", value: 30, reason: "you asked for a more casual tone" });
  if (/\b(short(er)?|tighten|tighter|concise|trim|cut|brief(er)?|condense|punchy)\b/.test(t))
    out.push({ axis: "length", value: 24, reason: "you asked to make it tighter" });
  if (/\b(longer|fuller|expand|more detail|elaborate|complete|thorough)\b/.test(t))
    out.push({ axis: "length", value: 76, reason: "you asked for more detail" });
  if (/\b(natural|less polished|less formulaic|less generic|human|plainer|real)\b/.test(t))
    out.push({ axis: "naturalness", value: 74, reason: "you asked to make it more natural" });
  if (/\b(polished|refined|formal prose|buttoned[- ]up)\b/.test(t))
    out.push({ axis: "naturalness", value: 32, reason: "you asked to keep it polished" });
  return out;
}

const GENERIC =
  /\b(i hope this (email |message )?finds you well|i wanted to reach out|i am reaching out|just wanted to|at the end of the day|circle back|touch base|leverage|synergy|in order to|it is important to note|needless to say|as you know|moving forward)\b/i;
const HYPE = /\b(revolutionary|game-?chang|seamless|cutting-?edge|world-?class|best-in-class|unprecedented|effortless|supercharge|unlock)\b/i;

/** Lightweight selection analysis (no model). Returns nudges + flags. */
export function selectionSignals(selection: string | undefined): {
  generic: boolean;
  hype: boolean;
  long: boolean;
  buriedAsk: boolean;
} {
  if (!selection) return { generic: false, hype: false, long: false, buriedAsk: false };
  const words = selection.trim().split(/\s+/).length;
  const askIdx = selection.search(/\?|\b(could you|can you|would you|please|let me know|i'?d love)\b/i);
  return {
    generic: GENERIC.test(selection),
    hype: HYPE.test(selection),
    long: words >= 45,
    buriedAsk: askIdx >= 0 && askIdx / Math.max(1, selection.length) > 0.55,
  };
}
