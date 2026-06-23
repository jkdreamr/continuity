import type { DocumentBrief, DocumentKind, Relationship } from "@/types/continuity";

/**
 * Deterministic, task-local Document Brief inference. Runs offline (no provider)
 * so it works before any library exists. Confidence gates how it's surfaced:
 * high → editable chips, medium → a light "is this …?" ask, low → don't apply.
 * Inferred facts never become durable memory.
 */

const KIND_SIGNALS: { kind: DocumentKind; re: RegExp }[] = [
  { kind: "investor_follow_up", re: /\b(investor|vc|venture|follow.?up|raise|funding|pitch|term sheet)\b/i },
  { kind: "manager_email", re: /\b(deadline|time off|pto|sick day|day off|email to my (boss|manager))\b/i },
  { kind: "memo", re: /\b(memo|update|founder update|team update|status|recap|progress)\b/i },
  { kind: "post", re: /\b(post|tweet|thread|social|linkedin|announcement|launch)\b/i },
  { kind: "reply", re: /\b(reply|respond|response to|get back to)\b/i },
];

const RELATIONSHIP_SIGNALS: { rel: Relationship; re: RegExp }[] = [
  { rel: "manager", re: /\b(boss|manager|supervisor)\b/i },
  { rel: "investor", re: /\b(investor|vc|venture)\b/i },
  { rel: "customer", re: /\b(customer|client)\b/i },
  { rel: "peer", re: /\b(team|teammate|colleague|coworker|peer)\b/i },
  { rel: "public", re: /\b(post|social|linkedin|public|audience|followers)\b/i },
];

const TONE_SIGNALS: { tone: string; re: RegExp }[] = [
  { tone: "formal", re: /\bformal\b/i },
  { tone: "direct", re: /\bdirect\b/i },
  { tone: "respectful", re: /\brespectful\b/i },
  { tone: "warm", re: /\bwarm\b/i },
  { tone: "casual", re: /\bcasual\b/i },
  { tone: "concise", re: /\b(concise|brief|short)\b/i },
];

export function inferBrief(text: string, opts?: { userStated?: boolean }): DocumentBrief {
  const userStated = Boolean(opts?.userStated);
  const t = text.trim();

  const kind = KIND_SIGNALS.find((s) => s.re.test(t))?.kind ?? "other";
  const relationship = RELATIONSHIP_SIGNALS.find((s) => s.re.test(t))?.rel;
  const tone = TONE_SIGNALS.filter((s) => s.re.test(t)).map((s) => s.tone);

  // Goal extraction requires an explicit ask verb (avoids matching every "to").
  const goalMatch = t.match(/\b(?:asking|ask|request(?:ing)?)\b\s+(?:to\s+|for\s+)?([^.;\n]{3,60})/i);
  const goal = goalMatch?.[1]?.trim();

  // Confidence: count distinct signal categories.
  const signals = [kind !== "other", Boolean(relationship), tone.length > 0, Boolean(goal)].filter(Boolean).length;
  let confidence: DocumentBrief["confidence"];
  if (userStated && signals >= 1) confidence = "high";
  else if (signals >= 2) confidence = "high";
  else if (signals === 1) confidence = "medium";
  else confidence = "low";

  return {
    kind,
    goal: goal || undefined,
    audience: relationship ? relationshipAudience(relationship) : undefined,
    relationship,
    tone: tone.length ? tone : undefined,
    facts: [],
    unknowns: [],
    confidence,
    source: userStated ? "user_stated" : "inferred_from_document",
  };
}

function relationshipAudience(rel: Relationship): string {
  return {
    manager: "Your manager",
    peer: "A teammate",
    investor: "An investor",
    customer: "A customer",
    public: "A public audience",
  }[rel];
}
