/** Deterministic, offline source analysis (no provider needed, task-local). */
export type SourceAnalysis = { summary: string; facts: string[]; replyTarget: boolean };

export function analyzeSource(text: string): SourceAnalysis {
  const clean = text.trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 2).join(" ").slice(0, 300);

  const facts = clean
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && /\d|\b(deadline|due|by|need|please|will|asap|budget)\b/i.test(l))
    .slice(0, 5);

  const replyTarget = /\b(hi|hello|dear|regards|best,|thanks|cheers)\b/i.test(clean) || /\?\s*$/.test(clean);
  return { summary, facts, replyTarget };
}
