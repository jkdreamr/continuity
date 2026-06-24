import type { ContractItem, DocumentBrief } from "@/types/continuity";
import type { TuneVector } from "./types";
import { selectionSignals, situationFromBrief } from "./rules";

/**
 * Contextual quick actions (V10). At most three, derived from the selection and
 * context, never a static shelf, never shown on a blank document. A quick action
 * just sets relevant control values and begins the same live Tune interaction.
 */
export type QuickAction = { id: string; label: string; vector: Partial<TuneVector> };

const INFORMAL = /\b(hey|yeah|yep|nope|gonna|wanna|gotta|kinda|sorta|lol|tbh|ur|u r|btw)\b/i;

export function quickActionsFor(input: {
  selection: string;
  brief?: DocumentBrief;
  contractItems?: ContractItem[];
}): QuickAction[] {
  const sel = input.selection?.trim() ?? "";
  if (!sel) return [];
  const out: QuickAction[] = [];
  const signals = selectionSignals(sel);
  const words = sel.split(/\s+/).length;
  const situation = situationFromBrief(input.brief);
  const formalContext = situation === "manager_request" || situation === "investor_followup" || situation === "customer_note";
  const hasCommitment = (input.contractItems ?? []).some((i) => i.kind === "commitment");

  if (formalContext && INFORMAL.test(sel)) out.push({ id: "formal", label: "Make more formal", vector: { formality: 83 } });
  if (signals.long || words >= 40) out.push({ id: "tighten", label: "Tighten this", vector: { length: 17 } });
  if (signals.generic || signals.hype) out.push({ id: "natural", label: "Make more natural", vector: { naturalness: 83 } });
  if ((signals.buriedAsk || hasCommitment) && out.length < 3) out.push({ id: "ask", label: "Make ask explicit", vector: { length: 33, formality: 67 } });

  return out.slice(0, 3);
}
