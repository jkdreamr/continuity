import type { ContractItem, DocumentBrief } from "@/types/continuity";
import type { AutoTuneConfidence, AutoTuneRecommendation, AutoTuneSource, TuneVector } from "./types";
import { BASELINES, explicitSignals, selectionSignals, situationFromBrief } from "./rules";
import { clamp } from "./normalize";

/**
 * The AutoTune recommendation engine. Deterministic and explainable, no LLM
 * chooses initial settings. Precedence (highest first):
 *   explicit instruction → contract → brief → selection → approved voice → neutral.
 * Recommending never mutates text; it only proposes a starting posture.
 */
export type RecommendInput = {
  /** Explicit user instruction ("formal email to my professor"). */
  instruction?: string;
  brief?: DocumentBrief;
  contractItems?: ContractItem[];
  selection?: string;
  /** Approved long-run preference for direct, low-hype writing. */
  voiceDirectLowHype?: boolean;
  /** Injected for deterministic timestamps in tests. */
  now?: string;
};

export function recommendWriting(input: RecommendInput): AutoTuneRecommendation {
  const reasons: string[] = [];
  let source: AutoTuneSource = "neutral";
  let confidence: AutoTuneConfidence = "low";

  // 1. Brief → the structural baseline.
  const situation = situationFromBrief(input.brief);
  const base = BASELINES[situation];
  let vector: TuneVector = { ...base.vector };
  if (situation !== "unknown") {
    source = "brief";
    confidence = "medium";
    reasons.push(cap(base.situation));
  }

  // 2. Contract → protect facts/commitments → concise + measured. Outranks brief.
  const items = input.contractItems ?? [];
  const hasCommitments = items.some(
    (i) => i.kind === "commitment" || i.kind === "constraint" || i.kind === "decision",
  );
  if (hasCommitments) {
    vector.length = Math.min(vector.length, 40);
    vector.naturalness = Math.min(vector.naturalness, 56);
    source = "contract";
    confidence = "high";
    reasons.push("preserve your commitments");
  }

  // 3. Selection analysis → tighter / more natural nudges.
  const sel = selectionSignals(input.selection);
  if (sel.long || sel.generic) vector.length -= 8;
  if (sel.generic || sel.hype) vector.naturalness += 8;
  if (sel.generic) reasons.push("trims generic phrasing");
  if (sel.buriedAsk) reasons.push("the ask is buried");
  if ((sel.long || sel.generic || sel.hype) && source === "neutral") source = "selection";
  if ((sel.long || sel.generic || sel.hype) && confidence === "low") confidence = "medium";

  // 4. Approved voice → nudge toward specific / less polished.
  if (input.voiceDirectLowHype) {
    vector.naturalness += 6;
    vector.formality -= 4;
    if (source === "neutral") source = "voice";
    reasons.push("your approved direct voice");
  }

  // 5. Explicit instruction → highest priority; sets axes hard.
  const explicit = explicitSignals(input.instruction);
  if (explicit.length) {
    for (const s of explicit) {
      vector[s.axis] = s.value;
      reasons.unshift(s.reason);
    }
    source = "explicit";
    confidence = "high";
  }

  // Nothing credible → neutral baseline; ask one lightweight question (UI).
  if (
    situation === "unknown" &&
    !hasCommitments &&
    !explicit.length &&
    !sel.generic &&
    !sel.long &&
    !sel.hype &&
    !input.voiceDirectLowHype
  ) {
    return {
      surface: "writing",
      values: { formality: 50, length: 50, naturalness: 50 },
      confidence: "low",
      source: "neutral",
      reasons: ["Not enough context yet"],
      userOverride: false,
      generatedAt: input.now ?? "",
    };
  }

  return {
    surface: "writing",
    values: {
      formality: clamp(vector.formality),
      length: clamp(vector.length),
      naturalness: clamp(vector.naturalness),
    },
    confidence,
    source,
    reasons: reasons.slice(0, 4),
    userOverride: false,
    generatedAt: input.now ?? "",
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
